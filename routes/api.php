<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Employee\DashboardController as EmployeeDashboardController;
use App\Http\Controllers\Api\Employee\DailyUpdateController as EmployeeDailyUpdateController;
use App\Http\Controllers\Api\Employee\ProjectController as EmployeeProjectController;
use App\Http\Controllers\Api\Employee\TaskController as EmployeeTaskController;
use App\Http\Controllers\Api\Manager\DashboardController as ManagerDashboardController;
use App\Http\Controllers\Api\Manager\DailyUpdateController as ManagerDailyUpdateController;
use App\Http\Controllers\Api\Manager\ProjectController as ManagerProjectController;
use App\Http\Controllers\Api\Manager\TaskController as ManagerTaskController;
use App\Http\Controllers\Api\Manager\TeamController as ManagerTeamController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public API Routes
|--------------------------------------------------------------------------
*/

// Login must remain outside the auth:sanctum middleware group.
Route::post('/login', [AuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| Authenticated API Routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    // Authentication and profile
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::post('/profile', [AuthController::class, 'updateProfile']);

    /*
    |--------------------------------------------------------------------------
    | Employee Routes
    |--------------------------------------------------------------------------
    */

    Route::prefix('employee')
        ->name('employee.')
        ->group(function () {

            Route::get('/dashboard', [
                EmployeeDashboardController::class,
                'index',
            ])->name('dashboard');

            Route::get('/projects', [
                EmployeeProjectController::class,
                'index',
            ])->name('projects.index');

            Route::get('/projects/{project}', [
                EmployeeProjectController::class,
                'show',
            ])->name('projects.show');

            Route::get('/tasks', [
                EmployeeTaskController::class,
                'index',
            ])->name('tasks.index');

            Route::get('/tasks/{task}', [
                EmployeeTaskController::class,
                'show',
            ])->name('tasks.show');

            Route::get('/daily-updates', [
                EmployeeDailyUpdateController::class,
                'index',
            ])->name('daily-updates.index');

            Route::get('/daily-updates/create', [
                EmployeeDailyUpdateController::class,
                'create',
            ])->name('daily-updates.create');

            Route::post('/daily-updates', [
                EmployeeDailyUpdateController::class,
                'store',
            ])->name('daily-updates.store');

            Route::get('/daily-updates/{dailyUpdate}', [
                EmployeeDailyUpdateController::class,
                'show',
            ])->name('daily-updates.show');
        });

    /*
    |--------------------------------------------------------------------------
    | Manager Routes
    |--------------------------------------------------------------------------
    */

    Route::prefix('manager')
        ->name('manager.')
        ->group(function () {

            Route::get('/dashboard', [
                ManagerDashboardController::class,
                'index',
            ])->name('dashboard');

            // Projects
            Route::get('/projects', [
                ManagerProjectController::class,
                'index',
            ])->name('projects.index');

            Route::post('/projects', [
                ManagerProjectController::class,
                'store',
            ])->name('projects.store');

            Route::get('/projects/{project}', [
                ManagerProjectController::class,
                'show',
            ])->name('projects.show');

            Route::put('/projects/{project}', [
                ManagerProjectController::class,
                'update',
            ])->name('projects.update');

            Route::patch('/projects/{project}', [
                ManagerProjectController::class,
                'update',
            ]);

            Route::delete('/projects/{project}', [
                ManagerProjectController::class,
                'destroy',
            ])->name('projects.destroy');

            // Tasks
            Route::get('/tasks', [
                ManagerTaskController::class,
                'index',
            ])->name('tasks.index');

            Route::post('/tasks', [
                ManagerTaskController::class,
                'store',
            ])->name('tasks.store');

            Route::get('/tasks/{task}', [
                ManagerTaskController::class,
                'show',
            ])->name('tasks.show');

            Route::put('/tasks/{task}', [
                ManagerTaskController::class,
                'update',
            ])->name('tasks.update');

            Route::patch('/tasks/{task}', [
                ManagerTaskController::class,
                'update',
            ]);

            Route::delete('/tasks/{task}', [
                ManagerTaskController::class,
                'destroy',
            ])->name('tasks.destroy');

            // Team
            Route::get('/team', [
                ManagerTeamController::class,
                'index',
            ])->name('team.index');

            // Daily updates
            Route::get('/daily-updates', [
                ManagerDailyUpdateController::class,
                'index',
            ])->name('daily-updates.index');

            Route::get('/daily-updates/{dailyUpdate}', [
                ManagerDailyUpdateController::class,
                'show',
            ])->name('daily-updates.show');

            Route::patch('/daily-updates/{dailyUpdate}/review', [
                ManagerDailyUpdateController::class,
                'review',
            ])->name('daily-updates.review');

            Route::patch('/daily-updates/{dailyUpdate}/acknowledge-blocker', [
                ManagerDailyUpdateController::class,
                'acknowledgeBlocker',
            ])->name('daily-updates.acknowledge-blocker');

            Route::post('/daily-updates/{dailyUpdate}/comment', [
                ManagerDailyUpdateController::class,
                'comment',
            ])->name('daily-updates.comment');
        });
});
