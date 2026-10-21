
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Project = {
    id: number;
    title?: string;
    name?: string;
    status?: string | null;
};

type Task = {
    id: number;
    title?: string;
    status?: string | null;
    project_id?: number | null;
};

type ResourceCollection<T> = {
    data?: T[];
};

type CreateResponse = {
    message?: string;
    projects?: Project[] | ResourceCollection<Project>;
    tasks?: Task[] | ResourceCollection<Task>;
    data?:
        | Project[]
        | Task[]
        | {
              projects?: Project[] | ResourceCollection<Project>;
              tasks?: Task[] | ResourceCollection<Task>;
          };
};

function isResourceCollection<T>(
    value: T[] | ResourceCollection<T>
): value is ResourceCollection<T> {
    return !Array.isArray(value) && typeof value === "object";
}

function extractProjects(response: CreateResponse): Project[] {
    const projects = response.projects;

    if (Array.isArray(projects)) {
        return projects;
    }

    if (
        projects &&
        isResourceCollection(projects) &&
        Array.isArray(projects.data)
    ) {
        return projects.data;
    }

    if (
        response.data &&
        !Array.isArray(response.data) &&
        typeof response.data === "object"
    ) {
        const nestedProjects = response.data.projects;

        if (Array.isArray(nestedProjects)) {
            return nestedProjects;
        }

        if (
            nestedProjects &&
            isResourceCollection(nestedProjects) &&
            Array.isArray(nestedProjects.data)
        ) {
            return nestedProjects.data;
        }
    }

    return [];
}

function extractTasks(response: CreateResponse): Task[] {
    const tasks = response.tasks;

    if (Array.isArray(tasks)) {
        return tasks;
    }

    if (
        tasks &&
        isResourceCollection(tasks) &&
        Array.isArray(tasks.data)
    ) {
        return tasks.data;
    }

    if (
        response.data &&
        !Array.isArray(response.data) &&
        typeof response.data === "object"
    ) {
        const nestedTasks = response.data.tasks;

        if (Array.isArray(nestedTasks)) {
            return nestedTasks;
        }

        if (
            nestedTasks &&
            isResourceCollection(nestedTasks) &&
            Array.isArray(nestedTasks.data)
        ) {
            return nestedTasks.data;
        }
    }

    return [];
}

function getProjectName(project: Project): string {
    return project.title || project.name || "Untitled Project";
}

function normalizeStatus(status?: string | null): string {
    if (!status) {
        return "";
    }

    return status.toLowerCase().replace(/[_-]/g, " ");
}

export default function EmployeeDailyUpdateCreatePage() {
    const router = useRouter();

    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);

    const [projectId, setProjectId] = useState("");
    const [taskId, setTaskId] = useState("");
    const [updateDate, setUpdateDate] = useState("");
    const [workDescription, setWorkDescription] = useState("");
    const [hoursSpent, setHoursSpent] = useState("");
    const [hasBlocker, setHasBlocker] = useState(false);
    const [blockerDetails, setBlockerDetails] = useState("");
    const [plansForTomorrow, setPlansForTomorrow] = useState("");

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const getToken = () => {
        if (typeof window === "undefined") {
            return null;
        }

        return localStorage.getItem("nexra_token");
    };

    useEffect(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");

        setUpdateDate(`${year}-${month}-${day}`);
    }, []);

    useEffect(() => {
        const loadFormData = async () => {
            try {
                setLoading(true);
                setError("");

                const token = getToken();

                if (!token) {
                    throw new Error(
                        "Authentication session not found. Please log in again."
                    );
                }

                const response = await apiFetch<CreateResponse>(
                    "/employee/daily-updates/create",
                    { token }
                );

                setProjects(extractProjects(response));
                setTasks(extractTasks(response));
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Unable to load daily update form."
                );
            } finally {
                setLoading(false);
            }
        };

        loadFormData();
    }, []);

    const selectedProjectTasks = tasks.filter((task) => {
        if (!projectId) {
            return true;
        }

        return Number(task.project_id) === Number(projectId);
    });

    const submitUpdate = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (submitting) {
            return;
        }

        setError("");
        setSuccess("");

        if (!projectId) {
            setError("Please select a project.");
            return;
        }

        if (!workDescription.trim()) {
            setError("Please describe the work you accomplished.");
            return;
        }

        const numericHours = Number(hoursSpent);

        if (
            hoursSpent.trim() === "" ||
            !Number.isFinite(numericHours) ||
            numericHours <= 0
        ) {
            setError("Please enter valid hours spent.");
            return;
        }

        if (numericHours > 24) {
            setError("Hours spent cannot be greater than 24 hours.");
            return;
        }

        if (hasBlocker && !blockerDetails.trim()) {
            setError(
                "Please describe the blocker or turn off the blocker option."
            );
            return;
        }

        try {
            setSubmitting(true);

            const token = getToken();

            if (!token) {
                throw new Error(
                    "Authentication session not found. Please log in again."
                );
            }

            const payload = {
                project_id: Number(projectId),
                task_id: taskId ? Number(taskId) : null,
                update_date: updateDate,
                work_description: workDescription.trim(),
                hours_spent: numericHours,

                // Default status; the form has no status dropdown.
                status: "pending",

                blocker_details: hasBlocker
                    ? blockerDetails.trim()
                    : null,

                plans_for_tomorrow:
                    plansForTomorrow.trim() || null,
            };

            await apiFetch(
                "/employee/daily-updates",
                {
                    method: "POST",
                    token,
                    body: JSON.stringify(payload),
                }
            );

            setSuccess("Daily update submitted successfully.");

            setTimeout(() => {
                router.push("/employee/daily-updates");
            }, 700);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to submit daily update."
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
                <div className="mx-auto max-w-5xl space-y-6">
                    <div className="h-8 w-36 animate-pulse rounded-lg bg-slate-200" />
                    <div className="h-44 animate-pulse rounded-3xl bg-slate-200" />
                    <div className="rounded-3xl bg-white p-6 sm:p-8">
                        <div className="space-y-5">
                            {[1, 2, 3, 4, 5].map((item) => (
                                <div
                                    key={item}
                                    className="h-14 animate-pulse rounded-xl bg-slate-100"
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-5xl space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                        href="/employee/daily-updates"
                        className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
                    >
                        <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m15 19-7-7 7-7"
                            />
                        </svg>
                        Back to Daily Updates
                    </Link>
                </div>

                <section className="relative overflow-hidden rounded-3xl bg-slate-950 shadow-xl">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.28),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.16),transparent_35%)]" />

                    <div className="relative p-6 sm:p-8 lg:p-10">
                        <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                            Daily Standup
                        </span>

                        <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                            Submit Daily Update
                        </h1>

                        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                            Keep your manager updated on today's work,
                            progress, blockers and tomorrow's plan.
                        </p>
                    </div>
                </section>

                {(error || success) && (
                    <div
                        className={`rounded-2xl border px-5 py-4 text-sm font-medium ${
                            error
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                    >
                        {error || success}
                    </div>
                )}

                <form
                    onSubmit={submitUpdate}
                    className="rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                    <div className="border-b border-slate-100 p-6 sm:p-8">
                        <h2 className="text-lg font-bold text-slate-900">
                            Work Summary
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Tell your manager what you worked on today.
                        </p>
                    </div>

                    <div className="space-y-8 p-6 sm:p-8">
                        <div className="grid gap-5 md:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="project"
                                    className="mb-2 block text-sm font-bold text-slate-800"
                                >
                                    Project
                                    <span className="ml-1 text-rose-500">*</span>
                                </label>

                                <select
                                    id="project"
                                    value={projectId}
                                    onChange={(event) => {
                                        setProjectId(event.target.value);
                                        setTaskId("");
                                    }}
                                    required
                                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                                >
                                    <option value="">Select a project</option>

                                    {projects.map((project) => (
                                        <option
                                            key={project.id}
                                            value={project.id}
                                        >
                                            {getProjectName(project)}
                                            {project.status
                                                ? ` — ${normalizeStatus(project.status)}`
                                                : ""}
                                        </option>
                                    ))}
                                </select>

                                {projects.length === 0 && (
                                    <p className="mt-2 text-xs text-amber-600">
                                        No projects are currently available for
                                        daily updates.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="task"
                                    className="mb-2 block text-sm font-bold text-slate-800"
                                >
                                    Task
                                    <span className="ml-2 text-xs font-normal text-slate-400">
                                        Optional
                                    </span>
                                </label>

                                <select
                                    id="task"
                                    value={taskId}
                                    onChange={(event) =>
                                        setTaskId(event.target.value)
                                    }
                                    disabled={!projectId}
                                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <option value="">
                                        {projectId
                                            ? "Select a task"
                                            : "Select a project first"}
                                    </option>

                                    {selectedProjectTasks
                                        .filter(
                                            (task) =>
                                                Number(task.project_id) ===
                                                Number(projectId)
                                        )
                                        .map((task) => (
                                            <option
                                                key={task.id}
                                                value={task.id}
                                            >
                                                {task.title ||
                                                    `Task #${task.id}`}
                                            </option>
                                        ))}
                                </select>

                                {projectId &&
                                    selectedProjectTasks.filter(
                                        (task) =>
                                            Number(task.project_id) ===
                                            Number(projectId)
                                    ).length === 0 && (
                                        <p className="mt-2 text-xs text-slate-400">
                                            No tasks are available for this
                                            project.
                                        </p>
                                    )}
                            </div>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="update-date"
                                    className="mb-2 block text-sm font-bold text-slate-800"
                                >
                                    Update Date
                                    <span className="ml-1 text-rose-500">*</span>
                                </label>

                                <input
                                    id="update-date"
                                    type="date"
                                    value={updateDate}
                                    onChange={(event) =>
                                        setUpdateDate(event.target.value)
                                    }
                                    required
                                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="hours"
                                    className="mb-2 block text-sm font-bold text-slate-800"
                                >
                                    Hours Spent
                                    <span className="ml-1 text-rose-500">*</span>
                                </label>

                                <input
                                    id="hours"
                                    type="number"
                                    min="0.1"
                                    max="24"
                                    step="any"
                                    value={hoursSpent}
                                    onChange={(event) =>
                                        setHoursSpent(event.target.value)
                                    }
                                    placeholder="e.g. 7.5"
                                    required
                                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                                />

                                <p className="mt-2 text-xs text-slate-400">
                                    Enter the total time spent on today's work.
                                </p>
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="work-description"
                                className="mb-2 block text-sm font-bold text-slate-800"
                            >
                                Work Accomplished
                                <span className="ml-1 text-rose-500">*</span>
                            </label>

                            <textarea
                                id="work-description"
                                value={workDescription}
                                onChange={(event) =>
                                    setWorkDescription(event.target.value)
                                }
                                rows={6}
                                required
                                placeholder="Describe what you completed, implemented, fixed, tested or worked on today..."
                                className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                            />

                            <p className="mt-2 text-xs text-slate-400">
                                Be specific about the work completed today.
                            </p>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 p-6 sm:p-8">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Blocker
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Let your manager know if something is
                                    blocking your progress.
                                </p>
                            </div>

                            <button
                                type="button"
                                role="switch"
                                aria-checked={hasBlocker}
                                onClick={() =>
                                    setHasBlocker((current) => !current)
                                }
                                className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition ${
                                    hasBlocker
                                        ? "bg-amber-500"
                                        : "bg-slate-300"
                                }`}
                            >
                                <span
                                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                                        hasBlocker ? "left-6" : "left-1"
                                    }`}
                                />
                            </button>
                        </div>

                        {hasBlocker && (
                            <div className="mt-5">
                                <label
                                    htmlFor="blocker"
                                    className="mb-2 block text-sm font-bold text-slate-800"
                                >
                                    What is blocking you?
                                    <span className="ml-1 text-rose-500">*</span>
                                </label>

                                <textarea
                                    id="blocker"
                                    value={blockerDetails}
                                    onChange={(event) =>
                                        setBlockerDetails(event.target.value)
                                    }
                                    rows={4}
                                    required
                                    placeholder="Describe the issue, dependency, access problem or decision you need..."
                                    className="w-full resize-y rounded-2xl border border-amber-200 bg-amber-50/50 px-4 py-3.5 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-amber-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                                />
                            </div>
                        )}

                        {!hasBlocker && (
                            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                    <svg
                                        className="h-5 w-5"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="m5 12 4 4L19 6"
                                        />
                                    </svg>
                                </div>
                                <p className="text-sm font-medium text-slate-600">
                                    No blocker to report.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-100 p-6 sm:p-8">
                        <h2 className="text-lg font-bold text-slate-900">
                            Tomorrow's Plan
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Briefly describe what you plan to work on next.
                        </p>

                        <textarea
                            value={plansForTomorrow}
                            onChange={(event) =>
                                setPlansForTomorrow(event.target.value)
                            }
                            rows={5}
                            placeholder="What do you plan to work on tomorrow?"
                            className="mt-5 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100"
                        />
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-end sm:p-8">
                        <Link
                            href="/employee/daily-updates"
                            className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                            Cancel
                        </Link>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-7 text-sm font-bold text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {submitting ? (
                                <>
                                    <svg
                                        className="h-4 w-4 animate-spin"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                        />
                                    </svg>
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    Submit Daily Update
                                    <svg
                                        className="h-4 w-4"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M5 12h14m-6-6 6 6-6 6"
                                        />
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}
