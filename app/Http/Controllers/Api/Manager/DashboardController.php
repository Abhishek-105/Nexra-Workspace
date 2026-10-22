<?php

namespace App\Http\Controllers\Api\Manager;

use App\Http\Controllers\Controller;
use App\Http\Resources\DailyUpdateResource;
use App\Http\Resources\ProjectResource;
use App\Http\Resources\TaskResource;
use App\Http\Resources\UserResource;
use App\Models\DailyUpdate;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $today = Carbon::today();

        $weekStart = Carbon::now()->startOfWeek();
        $weekEnd = Carbon::now()->endOfWeek();

        /*
        |--------------------------------------------------------------------------
        | Tasks
        |--------------------------------------------------------------------------
        */

        $tasks = Task::with([
            'project',
            'assignedEmployee',
            'assignees',
            'creator',
        ])
            ->latest()
            ->get();

        $totalTasks = $tasks->count();

        $pendingTasks = $tasks
            ->filter(fn (Task $task): bool =>
                $this->normalizeStatus($task->status) === 'pending'
            )
            ->count();

        $inProgressTasks = $tasks
            ->filter(fn (Task $task): bool =>
                $this->normalizeStatus($task->status) === 'in_progress'
            )
            ->count();

        $completedTasks = $tasks
            ->filter(fn (Task $task): bool =>
                $this->normalizeStatus($task->status) === 'completed'
            )
            ->count();

        $overdueTasks = $tasks
            ->filter(function (Task $task) use ($today): bool {
                if (!$task->deadline) {
                    return false;
                }

                $deadline = Carbon::parse((string) $task->deadline);

                return $deadline->lt($today)
                    && $this->normalizeStatus($task->status) !== 'completed';
            })
            ->count();

        /*
        |--------------------------------------------------------------------------
        | Task Due Dates
        |--------------------------------------------------------------------------
        */

        $tasksDueToday = $tasks
            ->filter(function (Task $task) use ($today): bool {
                if (!$task->deadline) {
                    return false;
                }

                $deadline = Carbon::parse((string) $task->deadline);

                return $deadline->isSameDay($today)
                    && $this->normalizeStatus($task->status) !== 'completed';
            })
            ->count();

        $tasksDueThisWeek = $tasks
            ->filter(function (Task $task) use ($weekStart, $weekEnd): bool {
                if (!$task->deadline) {
                    return false;
                }

                if ($this->normalizeStatus($task->status) === 'completed') {
                    return false;
                }

                $deadline = Carbon::parse((string) $task->deadline);

                return $deadline->betweenIncluded(
                    $weekStart,
                    $weekEnd
                );
            })
            ->count();

        /*
        |--------------------------------------------------------------------------
        | Task Completion
        |--------------------------------------------------------------------------
        */

        $taskCompletionPercentage = $totalTasks > 0
            ? (int) round(($completedTasks / $totalTasks) * 100)
            : 0;

        /*
        |--------------------------------------------------------------------------
        | Projects
        |--------------------------------------------------------------------------
        */

        $projects = Project::with([
            'creator',
            'employees',
        ])
            ->latest()
            ->get();

        $totalProjects = $projects->count();

        $activeProjects = $projects
            ->where('status', 'active')
            ->count();

        $completedProjects = $projects
            ->where('status', 'completed')
            ->count();

        $pendingProjects = $projects
            ->where('status', 'on-hold')
            ->count();

        $onHoldProjects = $pendingProjects;

        /*
        |--------------------------------------------------------------------------
        | Employees
        |--------------------------------------------------------------------------
        */

        $totalEmployees = User::query()
            ->where('role', 'employee')
            ->where('status', 'active')
            ->count();

        $recentEmployees = User::query()
            ->where('role', 'employee')
            ->where('status', 'active')
            ->latest('created_at')
            ->take(6)
            ->get();

        /*
        |--------------------------------------------------------------------------
        | Daily Updates
        |--------------------------------------------------------------------------
        */

        // Count updates reported for today's date.
        $todayUpdates = DailyUpdate::query()
            ->whereDate('update_date', $today->toDateString())
            ->count();

        // Keep the total count across all dates.
        $totalDailyUpdates = DailyUpdate::query()->count();

        /*
        |--------------------------------------------------------------------------
        | Recent Team Updates
        |--------------------------------------------------------------------------
        */

        // Preserve recent history, including updates from previous dates.
        $recentUpdates = DailyUpdate::query()
            ->with([
                'employee',
                'project',
            ])
            ->latest('created_at')
            ->take(4)
            ->get();

        /*
        |--------------------------------------------------------------------------
        | Recent Tasks
        |--------------------------------------------------------------------------
        */

        $recentTasks = $tasks
            ->sortByDesc(fn (Task $task): int =>
                $task->created_at?->timestamp ?? 0
            )
            ->take(8)
            ->values();

        /*
        |--------------------------------------------------------------------------
        | Recent Projects
        |--------------------------------------------------------------------------
        */

        $recentProjects = $projects
            ->sortByDesc(fn (Project $project): int =>
                $project->created_at?->timestamp ?? 0
            )
            ->take(6)
            ->values();

        /*
        |--------------------------------------------------------------------------
        | Completed Projects
        |--------------------------------------------------------------------------
        */

        $completedProjectList = $projects
            ->where('status', 'completed')
            ->sortByDesc(fn (Project $project): int =>
                $project->updated_at?->timestamp ?? 0
            )
            ->take(5)
            ->values();

        /*
        |--------------------------------------------------------------------------
        | Overdue Tasks
        |--------------------------------------------------------------------------
        */

        $overdueTaskList = $tasks
            ->filter(function (Task $task) use ($today): bool {
                if (!$task->deadline) {
                    return false;
                }

                if ($this->normalizeStatus($task->status) === 'completed') {
                    return false;
                }

                $deadline = Carbon::parse((string) $task->deadline);

                return $deadline->lt($today);
            })
            ->sortBy(function (Task $task): int {
                if (!$task->deadline) {
                    return PHP_INT_MAX;
                }

                return Carbon::parse((string) $task->deadline)->timestamp;
            })
            ->take(8)
            ->values();

        /*
        |--------------------------------------------------------------------------
        | Project Progress
        |--------------------------------------------------------------------------
        */

        $projectProgress = $projects
            ->take(8)
            ->map(function (Project $project): array {
                $projectTasks = $project->tasks()
                    ->select([
                        'id',
                        'project_id',
                        'status',
                        'deadline',
                    ])
                    ->get();

                $total = $projectTasks->count();

                $completed = $projectTasks
                    ->filter(fn (Task $task): bool =>
                        $this->normalizeStatus($task->status) === 'completed'
                    )
                    ->count();

                $percentage = $total > 0
                    ? (int) round(($completed / $total) * 100)
                    : 0;

                return [
                    'project' => new ProjectResource($project),
                    'total' => $total,
                    'completed' => $completed,
                    'percentage' => $percentage,
                ];
            })
            ->values();

        /*
        |--------------------------------------------------------------------------
        | Task Status Distribution
        |--------------------------------------------------------------------------
        */

        $taskStatusDistribution = [
            'pending' => $pendingTasks,
            'in_progress' => $inProgressTasks,
            'completed' => $completedTasks,
        ];

        /*
        |--------------------------------------------------------------------------
        | API Response
        |--------------------------------------------------------------------------
        */

        return response()->json([
            'message' => 'Manager dashboard retrieved successfully.',

            'stats' => [
                'total_tasks' => $totalTasks,
                'pending_tasks' => $pendingTasks,
                'in_progress_tasks' => $inProgressTasks,
                'completed_tasks' => $completedTasks,
                'overdue_tasks' => $overdueTasks,

                'tasks_due_today' => $tasksDueToday,
                'tasks_due_this_week' => $tasksDueThisWeek,

                'task_completion_percentage' => $taskCompletionPercentage,

                'total_projects' => $totalProjects,
                'active_projects' => $activeProjects,
                'completed_projects' => $completedProjects,
                'pending_projects' => $pendingProjects,
                'on_hold_projects' => $onHoldProjects,

                'total_employees' => $totalEmployees,

                'today_updates' => $todayUpdates,
                'total_daily_updates' => $totalDailyUpdates,
            ],

            'recent_employees' => UserResource::collection(
                $recentEmployees
            ),

            'recent_updates' => DailyUpdateResource::collection(
                $recentUpdates
            ),

            'recent_tasks' => TaskResource::collection(
                $recentTasks
            ),

            'recent_projects' => ProjectResource::collection(
                $recentProjects
            ),

            'completed_projects' => ProjectResource::collection(
                $completedProjectList
            ),

            'overdue_tasks' => TaskResource::collection(
                $overdueTaskList
            ),

            'project_progress' => $projectProgress,

            'task_status_distribution' => $taskStatusDistribution,
        ]);
    }

    private function normalizeStatus(?string $status): string
    {
        $status = strtolower(trim((string) $status));

        return match ($status) {
            'in progress',
            'in_progress' => 'in_progress',

            'done',
            'completed' => 'completed',

            default => 'pending',
        };
    }
}
