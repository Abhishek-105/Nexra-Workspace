<?php

namespace App\Http\Controllers\Api\Employee;

use App\Http\Controllers\Controller;
use App\Http\Resources\DailyUpdateResource;
use App\Http\Resources\ProjectResource;
use App\Models\DailyUpdate;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DailyUpdateController extends Controller
{
    /**
     * Return projects and tasks available to the authenticated employee.
     */
    public function create(Request $request): JsonResponse
    {
        $employee = $request->user();

        if (!$employee instanceof User) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        abort_unless(
            $employee->role === 'employee',
            403,
            'Only employees can access this resource.'
        );

        $projects = Project::query()
            ->whereHas('employees', function ($query) use ($employee) {
                $query->where('users.id', $employee->id);
            })
            ->orderBy('title')
            ->get();

        $projectIds = $projects->pluck('id');

        $tasks = Task::query()
            ->whereIn('project_id', $projectIds)
            ->where(function ($query) use ($employee) {
                $query->where('assigned_to', $employee->id)
                    ->orWhereHas('assignees', function ($assigneeQuery) use ($employee) {
                        $assigneeQuery->where('users.id', $employee->id);
                    });
            })
            ->with('project')
            ->orderBy('title')
            ->get();

        return response()->json([
            'message' => 'Daily update form data retrieved successfully.',
            'projects' => ProjectResource::collection($projects),
            'tasks' => $tasks,
        ]);
    }

    /**
     * Store a daily update for the authenticated employee.
     */
    public function store(Request $request): JsonResponse
    {
        $employee = $request->user();

        if (!$employee instanceof User) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        abort_unless(
            $employee->role === 'employee',
            403,
            'Only employees can submit daily updates.'
        );

        $validated = $request->validate([
            'project_id' => [
                'required',
                'integer',
                'exists:projects,id',
            ],
            'task_id' => [
                'nullable',
                'integer',
                'exists:tasks,id',
            ],
            'update_date' => [
                'required',
                'date',
            ],
            'work_description' => [
                'required',
                'string',
                'max:10000',
            ],
            'hours_spent' => [
                'required',
                'numeric',
                'min:0',
                'max:24',
            ],
            'blocker_details' => [
                'nullable',
                'string',
                'max:5000',
            ],
            'plans_for_tomorrow' => [
                'nullable',
                'string',
                'max:5000',
            ],
            'attached_file' => [
                'nullable',
                'file',
                'max:10240',
                'mimes:pdf,doc,docx,xls,xlsx,csv,txt,jpg,jpeg,png,webp',
            ],
        ]);

        $project = Project::query()
            ->whereKey($validated['project_id'])
            ->whereHas('employees', function ($query) use ($employee) {
                $query->where('users.id', $employee->id);
            })
            ->first();

        if (!$project) {
            return response()->json([
                'message' => 'You are not assigned to the selected project.',
                'errors' => [
                    'project_id' => [
                        'You are not assigned to the selected project.',
                    ],
                ],
            ], 422);
        }

        if (!empty($validated['task_id'])) {
            $task = Task::query()
                ->whereKey($validated['task_id'])
                ->where('project_id', $project->id)
                ->where(function ($query) use ($employee) {
                    $query->where('assigned_to', $employee->id)
                        ->orWhereHas('assignees', function ($assigneeQuery) use ($employee) {
                            $assigneeQuery->where('users.id', $employee->id);
                        });
                })
                ->first();

            if (!$task) {
                return response()->json([
                    'message' => 'The selected task is not assigned to you or does not belong to the selected project.',
                    'errors' => [
                        'task_id' => [
                            'Please select a task assigned to you in the selected project.',
                        ],
                    ],
                ], 422);
            }
        }

        $filePath = null;

        if ($request->hasFile('attached_file')) {
            $filePath = $request->file('attached_file')
                ->store('daily-updates', 'public');
        }

        $dailyUpdate = new DailyUpdate();

        $dailyUpdate->employee_id = $employee->id;
        $dailyUpdate->project_id = $project->id;
        $dailyUpdate->task_id = $validated['task_id'] ?? null;

        // The model casts update_date to a date, so assign the validated string.
        $dailyUpdate->update_date = $validated['update_date'];

        $dailyUpdate->work_description = $validated['work_description'];
        $dailyUpdate->hours_spent = $validated['hours_spent'];
        $dailyUpdate->blocker_details = $validated['blocker_details'] ?? null;
        $dailyUpdate->plans_for_tomorrow = $validated['plans_for_tomorrow'] ?? null;
        $dailyUpdate->attached_file = $filePath;

        // Employees cannot set their own review status.
        $dailyUpdate->status = 'pending';

        $dailyUpdate->save();

        $dailyUpdate->load([
            'employee',
            'project',
            'task',
            'reviewer',
            'blockerAcknowledgedBy',
        ]);

        return response()->json([
            'message' => 'Daily update submitted successfully.',
            'data' => new DailyUpdateResource($dailyUpdate),
        ], 201);
    }

    /**
     * Return the authenticated employee's daily updates.
     */
    public function index(Request $request): JsonResponse
    {
        $employee = $request->user();

        if (!$employee instanceof User) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        abort_unless(
            $employee->role === 'employee',
            403,
            'Only employees can access their daily updates.'
        );

        $validated = $request->validate([
            'date_range' => [
                'sometimes',
                'string',
                'in:today,yesterday,last_7_days,last_30_days,this_month,all_time',
            ],
            'status' => [
                'sometimes',
                'string',
                'in:pending,reviewed',
            ],
            'page' => [
                'sometimes',
                'integer',
                'min:1',
            ],
            'per_page' => [
                'sometimes',
                'integer',
                'min:1',
                'max:100',
            ],
        ]);

        $dateRange = $validated['date_range'] ?? 'all_time';
        $today = Carbon::today();

        $query = DailyUpdate::query()
            ->where('employee_id', $employee->id)
            ->with([
                'employee',
                'project',
                'task',
                'reviewer',
                'blockerAcknowledgedBy',
            ]);

        switch ($dateRange) {
            case 'today':
                $query->whereDate('update_date', $today->toDateString());
                break;

            case 'yesterday':
                $query->whereDate(
                    'update_date',
                    $today->copy()->subDay()->toDateString()
                );
                break;

            case 'last_7_days':
                $query->whereBetween('update_date', [
                    $today->copy()->subDays(6)->toDateString(),
                    $today->toDateString(),
                ]);
                break;

            case 'last_30_days':
                $query->whereBetween('update_date', [
                    $today->copy()->subDays(29)->toDateString(),
                    $today->toDateString(),
                ]);
                break;

            case 'this_month':
                $query->whereBetween('update_date', [
                    $today->copy()->startOfMonth()->toDateString(),
                    $today->toDateString(),
                ]);
                break;

            case 'all_time':
            default:
                break;
        }

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $perPage = $validated['per_page'] ?? 15;

        $dailyUpdates = $query
            ->orderByDesc('update_date')
            ->orderByDesc('created_at')
            ->paginate($perPage)
            ->withQueryString();

        $todayQuery = DailyUpdate::query()
            ->where('employee_id', $employee->id)
            ->whereDate('update_date', $today->toDateString());

        return response()->json([
            'message' => 'Daily updates retrieved successfully.',

            'filters' => [
                'date_range' => $dateRange,
                'status' => $validated['status'] ?? null,
            ],

            'statistics' => [
                'total_updates' => (clone $todayQuery)->count(),

                'reviewed_updates' => (clone $todayQuery)
                    ->where('status', 'reviewed')
                    ->count(),

                'pending_updates' => (clone $todayQuery)
                    ->where(function ($query) {
                        $query->whereNull('status')
                            ->orWhere('status', 'pending');
                    })
                    ->count(),

                'hours_spent' => (float) (clone $todayQuery)
                    ->sum('hours_spent'),

                'active_blockers' => (clone $todayQuery)
                    ->whereNotNull('blocker_details')
                    ->where('blocker_details', '!=', '')
                    ->whereNull('blocker_acknowledged_at')
                    ->count(),
            ],

            'data' => DailyUpdateResource::collection(
                $dailyUpdates->getCollection()
            ),

            'meta' => [
                'current_page' => $dailyUpdates->currentPage(),
                'last_page' => $dailyUpdates->lastPage(),
                'per_page' => $dailyUpdates->perPage(),
                'total' => $dailyUpdates->total(),
            ],
        ]);
    }

    /**
     * Display one daily update belonging to the authenticated employee.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $employee = $request->user();

        if (!$employee instanceof User) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        abort_unless(
            $employee->role === 'employee',
            403,
            'Only employees can view their daily updates.'
        );

        $dailyUpdate = DailyUpdate::query()
            ->where('employee_id', $employee->id)
            ->with([
                'employee',
                'project',
                'task',
                'reviewer',
                'blockerAcknowledgedBy',
            ])
            ->findOrFail($id);

        return response()->json([
            'message' => 'Daily update retrieved successfully.',
            'data' => new DailyUpdateResource($dailyUpdate),
        ]);
    }
}
