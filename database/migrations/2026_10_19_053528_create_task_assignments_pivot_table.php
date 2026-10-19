
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('task_assignments')) {
            Schema::create('task_assignments', function (Blueprint $table) {
                $table->id();

                $table->foreignId('task_id')
                    ->constrained('tasks')
                    ->cascadeOnDelete();

                $table->foreignId('employee_id')
                    ->constrained('users')
                    ->cascadeOnDelete();

                $table->timestamps();

                $table->unique(['task_id', 'employee_id']);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('task_assignments')) {
            Schema::dropIfExists('task_assignments');
        }
    }
};
