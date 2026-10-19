<?php

namespace App\Http\Controllers\Api\Employee;

use App\Http\Controllers\Controller;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class TaskController extends Controller
{
    /**
     * Display tasks assigned to the authenticated employee.
     */
    public function index(Request $request): JsonResponse
    {
        /** @var User|null $user */
        $user = $request->user();

        abort_unless(
            $user instanceof User && $user->isEmployee(),
            403
        );

        $query = Task::query()
            ->with([
                'project',
                'assignee',
                'assignees',
            ])
            ->where(function (Builder $query) use ($user): void {
                $query
                    ->where('assigned_to', $user->id)
                    ->orWhereHas(
                        'assignees',
                        function (Builder $assigneeQuery) use ($user): void {
                            $assigneeQuery->where(
                                'users.id',
                                $user->id
                            );
                        }
                    );
            });

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));

            $query->where(function (Builder $query) use ($search): void {
                $query
                    ->where('title', 'like', '%' . $search . '%')
                    ->orWhere(
                        'description',
                        'like',
                        '%' . $search . '%'
                    );
            });
        }

        if ($request->filled('status')) {
            $status = $this->normalizeStatus(
                (string) $request->input('status')
            );

            $query->where('status', $status);
        }

        if ($request->filled('priority')) {
            $priority = strtolower(
                trim((string) $request->input('priority'))
            );

            if (in_array(
                $priority,
                ['low', 'medium', 'high'],
                true
            )) {
                $query->where('priority', $priority);
            }
        }

        $tasks = $query
            ->latest()
            ->paginate(10)
            ->withQueryString();

        $employeeTasks = Task::query()
            ->where(function (Builder $query) use ($user): void {
                $query
                    ->where('assigned_to', $user->id)
                    ->orWhereHas(
                        'assignees',
                        function (Builder $assigneeQuery) use ($user): void {
                            $assigneeQuery->where(
                                'users.id',
                                $user->id
                            );
                        }
                    );
            })
            ->get([
                'id',
                'status',
            ]);

        $counts = [
            'all' => $employeeTasks->count(),

            'pending' => $employeeTasks
                ->filter(function (Task $task): bool {
                    return $this->normalizeStatus($task->status)
                        === 'pending';
                })
                ->count(),

            'in_progress' => $employeeTasks
                ->filter(function (Task $task): bool {
                    return $this->normalizeStatus($task->status)
                        === 'in_progress';
                })
                ->count(),

            'done' => $employeeTasks
                ->filter(function (Task $task): bool {
                    return $this->normalizeStatus($task->status)
                        === 'completed';
                })
                ->count(),
        ];

        return response()->json([
            'message' => 'Employee tasks retrieved successfully.',
            'counts' => $counts,
            'tasks' => TaskResource::collection($tasks),
        ]);
    }

    /**
     * Display a single task.
     */
    public function show(Task $task): JsonResponse
    {
        $this->authorizeTask($task);

        $task->load([
            'project',
            'assignee',
            'assignees',
        ]);

        return response()->json([
            'message' => 'Employee task retrieved successfully.',
            'task' => new TaskResource($task),
        ]);
    }

    /**
     * Update employee task status.
     */
    public function updateStatus(
        Request $request,
        Task $task
    ): JsonResponse {
        $this->authorizeTask($task);

        $validated = $request->validate([
            'status' => [
                'required',
                'string',
            ],
        ]);

        $newStatus = $this->normalizeStatus(
            $validated['status']
        );

        if (!in_array(
            $newStatus,
            [
                'pending',
                'in_progress',
                'completed',
            ],
            true
        )) {
            return response()->json([
                'message' => 'Invalid task status.',
            ], 422);
        }

        $oldStatus = $this->normalizeStatus(
            $task->status
        );

        $task->status = $newStatus;

        $this->applyStatusTimestamps(
            $task,
            $oldStatus,
            $newStatus
        );

        $task->save();

        $task->load([
            'project',
            'assignee',
            'assignees',
        ]);

        return response()->json([
            'message' => 'Task status updated successfully.',
            'task' => new TaskResource($task),
        ]);
    }

    /**
     * Ensure the employee is assigned directly or through the pivot table.
     */
    private function authorizeTask(Task $task): void
    {
        $user = request()->user();

        abort_unless(
            $user instanceof User && $user->isEmployee(),
            403
        );

        $isAssignedDirectly =
            (int) $task->assigned_to === (int) $user->id;

        $isAssignedThroughPivot = $task
            ->assignees()
            ->where('users.id', $user->id)
            ->exists();

        abort_unless(
            $isAssignedDirectly || $isAssignedThroughPivot,
            403
        );
    }

    /**
     * Normalize all supported task status values.
     */
    private function normalizeStatus(?string $status): string
    {
        $status = strtolower(
            trim((string) $status)
        );

        return match ($status) {
            'in progress',
            'in-progress',
            'in_progress' => 'in_progress',

            'done',
            'complete',
            'completed' => 'completed',

            'pending' => 'pending',

            default => 'pending',
        };
    }

    /**
     * Apply task workflow timestamps.
     */
    private function applyStatusTimestamps(
        Task $task,
        string $oldStatus,
        string $newStatus
    ): void {
        if ($newStatus === 'pending') {
            $task->started_at = null;
            $task->completed_at = null;

            return;
        }

        if ($newStatus === 'in_progress') {
            if ($task->started_at === null) {
                $task->started_at = Carbon::now();
            }

            $task->completed_at = null;

            return;
        }

        if ($newStatus === 'completed') {
            if ($task->started_at === null) {
                $task->started_at = Carbon::now();
            }

            if (
                $oldStatus !== 'completed'
                || $task->completed_at === null
            ) {
                $task->completed_at = Carbon::now();
            }
        }
    }
}
