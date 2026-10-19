
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";

type User = {
    id?: number;
    name?: string;
    email?: string;
    role?: string;
    designation?: string;
};

type Project = {
    id: number;
    title?: string;
    name?: string;
    description?: string;
    status?: string;
};

type Task = {
    id: number;
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    deadline?: string;
    project?: {
        id?: number;
        title?: string;
        name?: string;
    };
};

type DailyUpdate = {
    id: number;
    update_date?: string;
    work_description?: string;
    hours_spent?: number | string;
    status?: string;
    project?: {
        id?: number;
        title?: string;
        name?: string;
    };
};

type Statistics = {
    project_count?: number;
    total_tasks?: number;
    pending_tasks?: number;
    in_progress_tasks?: number;
    has_submitted_today?: boolean;
    today_updates?: number;
    logged_hours?: number | string;
    today_hours?: number | string;
};

type ApiResponse = {
    user?: User;
    statistics?: Statistics;
    projects?: Project[] | { data?: Project[] };
    recent_tasks?: Task[] | { data?: Task[] };
    upcoming_tasks?: Task[] | { data?: Task[] };
    recent_updates?: DailyUpdate[] | { data?: DailyUpdate[] };
};

function getToken(): string | null {
    if (typeof window === "undefined") {
        return null;
    }

    return localStorage.getItem("nexra_token");
}

function extractArray<T>(value?: T[] | { data?: T[] }): T[] {
    if (Array.isArray(value)) {
        return value;
    }

    return value?.data ?? [];
}

function formatDate(value?: string): string {
    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function getProjectName(project?: Project): string {
    return project?.title || project?.name || "Untitled Project";
}

function getTaskProjectName(task: Task): string {
    return task.project?.title || task.project?.name || "No project";
}

function normalizeStatus(status?: string): string {
    return (status || "pending").replace(/[_-]/g, " ").toLowerCase();
}

function getStatusClasses(status?: string): string {
    const value = normalizeStatus(status);

    if (value.includes("complete") || value.includes("done")) {
        return "border-emerald-100 bg-emerald-50 text-emerald-700";
    }

    if (value.includes("progress") || value.includes("active")) {
        return "border-green-100 bg-green-50 text-green-700";
    }

    if (value.includes("hold") || value.includes("block")) {
        return "border-amber-100 bg-amber-50 text-amber-700";
    }

    return "border-slate-200 bg-slate-50 text-slate-600";
}

function getPriorityClasses(priority?: string): string {
    const value = (priority || "").toLowerCase().trim();

    if (value.includes("high") || value.includes("urgent")) {
        return "border-red-100 bg-red-50 text-red-700";
    }

    if (value.includes("medium")) {
        return "border-amber-100 bg-amber-50 text-amber-700";
    }

    if (value.includes("low")) {
        return "border-emerald-100 bg-emerald-50 text-emerald-700";
    }

    return "border-slate-200 bg-slate-50 text-slate-600";
}

function DashboardIcon() {
    return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="4" y="4" width="6" height="6" rx="1" />
            <rect x="14" y="4" width="6" height="6" rx="1" />
            <rect x="4" y="14" width="6" height="6" rx="1" />
            <rect x="14" y="14" width="6" height="6" rx="1" />
        </svg>
    );
}

function FolderIcon() {
    return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.5A2.5 2.5 0 0 1 6.5 5h4l2 2h5A2.5 2.5 0 0 1 20 9.5v7A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
        </svg>
    );
}

function TaskIcon() {
    return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6h11M9 12h11M9 18h11" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m4 6 1.5 1.5L7.5 5M4 12l1.5 1.5L7.5 11M4 18l1.5 1.5L7.5 17" />
        </svg>
    );
}

function ClockIcon() {
    return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="8" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 2" />
        </svg>
    );
}

function ArrowIcon() {
    return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
        </svg>
    );
}

function PlusIcon() {
    return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
    );
}

export default function EmployeeDashboardPage() {
    const { user: authUser } = useAuth();

    const [data, setData] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let mounted = true;

        async function loadDashboard() {
            try {
                setLoading(true);
                setError("");

                const token = getToken();

                if (!token) {
                    throw new Error("Authentication token not found.");
                }

                const response = await apiFetch<ApiResponse>(
                    "/employee/dashboard",
                    { token }
                );

                if (mounted) {
                    setData(response);
                }
            } catch (err) {
                if (mounted) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Unable to load dashboard."
                    );
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        void loadDashboard();

        return () => {
            mounted = false;
        };
    }, []);

    const dashboardUser = data?.user || authUser;
    const statistics = data?.statistics || {};

    const projects = useMemo(
        () => extractArray(data?.projects).slice(0, 4),
        [data?.projects]
    );

    const recentTasks = useMemo(
        () => extractArray(data?.recent_tasks).slice(0, 5),
        [data?.recent_tasks]
    );

    const upcomingTasks = useMemo(
        () => extractArray(data?.upcoming_tasks).slice(0, 5),
        [data?.upcoming_tasks]
    );

    const recentUpdates = useMemo(
        () => extractArray(data?.recent_updates).slice(0, 4),
        [data?.recent_updates]
    );

    const projectCount = statistics.project_count ?? projects.length;
    const totalTasks = statistics.total_tasks ?? 0;
    const pendingTasks = statistics.pending_tasks ?? 0;
    const inProgressTasks = statistics.in_progress_tasks ?? 0;

    const hasSubmittedToday =
        statistics.has_submitted_today ??
        Boolean(statistics.today_updates);

    const todayHours = Number(
        statistics.today_hours ?? statistics.logged_hours ?? 0
    );

    if (loading) {
        return (
            <div className="space-y-5">
                <div className="h-32 animate-pulse rounded-2xl bg-[#171A19]" />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3].map((item) => (
                        <div
                            key={item}
                            className="h-24 animate-pulse rounded-2xl border border-[#E1E7E3] bg-white"
                        />
                    ))}
                </div>

                <div className="grid gap-5 xl:grid-cols-3">
                    <div className="h-72 animate-pulse rounded-2xl border border-[#E1E7E3] bg-white xl:col-span-2" />
                    <div className="h-72 animate-pulse rounded-2xl border border-[#E1E7E3] bg-white" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <p className="text-sm font-semibold text-red-800">
                    Unable to load dashboard
                </p>
                <p className="mt-1 text-sm text-red-600">{error}</p>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-5 bg-[#F5F7F6]">
            <section className="overflow-hidden rounded-2xl bg-[#171A19] shadow-sm">
                <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="mb-2 flex items-center gap-2 text-xs text-[#9AA69F]">
                            <DashboardIcon />
                            <span>Workspace</span>
                            <span className="text-[#56615B]">/</span>
                            <span className="text-[#C7D0CB]">Dashboard</span>
                        </div>

                        <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                            Good to see you,{" "}
                            {dashboardUser?.name?.split(" ")[0] || "there"}.
                        </h1>

                        <p className="mt-1 max-w-xl text-sm text-[#A4AEA8]">
                            Keep track of your projects, tasks and daily progress.
                        </p>
                    </div>

                    <Link
                        href="/employee/daily-updates/create"
                        className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#22C55E] px-3.5 py-2 text-sm font-semibold text-[#0B2616] shadow-sm transition hover:bg-[#16A34A]"
                    >
                        <PlusIcon />
                        Daily Update
                    </Link>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-[#E1E7E3] bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ECFDF3] text-[#166534]">
                            <FolderIcon />
                        </div>
                        <span className="text-xs font-medium text-[#6B7770]">
                            Active
                        </span>
                    </div>
                    <p className="mt-3 text-2xl font-bold tracking-tight text-[#18201C]">
                        {projectCount}
                    </p>
                    <p className="mt-0.5 text-xs text-[#6B7770]">My Projects</p>
                </div>

                <div className="rounded-2xl border border-[#E1E7E3] bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ECFDF3] text-[#166534]">
                            <TaskIcon />
                        </div>
                        <span className="text-xs font-medium text-[#6B7770]">
                            Total
                        </span>
                    </div>
                    <p className="mt-3 text-2xl font-bold tracking-tight text-[#18201C]">
                        {totalTasks}
                    </p>
                    <p className="mt-0.5 text-xs text-[#6B7770]">Assigned Tasks</p>
                </div>

                <div className="rounded-2xl border border-[#E1E7E3] bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ECFDF3] text-[#166534]">
                            <ClockIcon />
                        </div>
                        <span className="text-xs font-medium text-[#6B7770]">
                            Today
                        </span>
                    </div>
                    <p className="mt-3 text-2xl font-bold tracking-tight text-[#18201C]">
                        {todayHours}
                        <span className="ml-1 text-sm font-semibold text-[#6B7770]">
                            hrs
                        </span>
                    </p>
                    <p className="mt-0.5 text-xs text-[#6B7770]">Logged Time</p>
                </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-3">
                <div className="overflow-hidden rounded-2xl border border-[#E1E7E3] bg-white shadow-sm xl:col-span-2">
                    <div className="flex items-center justify-between border-b border-[#E8ECEA] px-5 py-4">
                        <div>
                            <h2 className="text-sm font-bold text-[#18201C]">
                                My Projects
                            </h2>
                            <p className="mt-0.5 text-xs text-[#6B7770]">
                                Projects currently assigned to you
                            </p>
                        </div>
                        <Link
                            href="/employee/projects"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534] hover:text-[#14532D]"
                        >
                            View all <ArrowIcon />
                        </Link>
                    </div>

                    {projects.length === 0 ? (
                        <div className="px-5 py-10 text-center">
                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#ECFDF3] text-[#166534]">
                                <FolderIcon />
                            </div>
                            <p className="mt-3 text-sm font-semibold text-[#18201C]">
                                No projects assigned
                            </p>
                            <p className="mt-1 text-xs text-[#6B7770]">
                                Your assigned projects will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-3 p-4 md:grid-cols-2">
                            {projects.map((project) => (
                                <Link
                                    key={project.id}
                                    href={`/employee/projects/${project.id}`}
                                    className="group overflow-hidden rounded-xl border border-[#E1E7E3] bg-white transition hover:-translate-y-0.5 hover:border-[#B8C9BE] hover:shadow-md"
                                >
                                    <div className="h-1 bg-[#166534]" />
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="truncate text-sm font-semibold text-[#18201C] group-hover:text-[#166534]">
                                                    {getProjectName(project)}
                                                </h3>
                                                <p className="mt-1 line-clamp-2 text-xs text-[#6B7770]">
                                                    {project.description ||
                                                        "No project description"}
                                                </p>
                                            </div>
                                            <span
                                                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${getStatusClasses(project.status)}`}
                                            >
                                                {normalizeStatus(project.status)}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-[#E1E7E3] bg-white shadow-sm">
                    <div className="border-b border-[#E8ECEA] px-5 py-4">
                        <h2 className="text-sm font-bold text-[#18201C]">
                            Today&apos;s Progress
                        </h2>
                        <p className="mt-0.5 text-xs text-[#6B7770]">
                            Your daily work status
                        </p>
                    </div>

                    <div className="p-5">
                        <div
                            className={`rounded-xl border p-4 ${
                                hasSubmittedToday
                                    ? "border-emerald-100 bg-emerald-50"
                                    : "border-amber-100 bg-amber-50"
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                                        hasSubmittedToday
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-amber-100 text-amber-700"
                                    }`}
                                >
                                    <ClockIcon />
                                </div>
                                <div>
                                    <p
                                        className={`text-sm font-semibold ${
                                            hasSubmittedToday
                                                ? "text-emerald-800"
                                                : "text-amber-800"
                                        }`}
                                    >
                                        {hasSubmittedToday
                                            ? "Update submitted"
                                            : "Update pending"}
                                    </p>
                                    <p
                                        className={`mt-0.5 text-xs ${
                                            hasSubmittedToday
                                                ? "text-emerald-700"
                                                : "text-amber-700"
                                        }`}
                                    >
                                        {hasSubmittedToday
                                            ? `${todayHours} hours logged today`
                                            : "Submit your daily progress"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 space-y-3">
                            {[
                                ["In progress", inProgressTasks],
                                ["Pending", pendingTasks],
                            ].map(([label, value]) => (
                                <div
                                    key={label}
                                    className="flex items-center justify-between"
                                >
                                    <span className="text-xs text-[#6B7770]">
                                        {label}
                                    </span>
                                    <span className="text-sm font-semibold text-[#18201C]">
                                        {value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <Link
                            href={
                                hasSubmittedToday
                                    ? "/employee/daily-updates"
                                    : "/employee/daily-updates/create"
                            }
                            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#166534] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#14532D]"
                        >
                            {hasSubmittedToday
                                ? "View Daily Updates"
                                : "Submit Daily Update"}
                            <ArrowIcon />
                        </Link>
                    </div>
                </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-3">
                <div className="overflow-hidden rounded-2xl border border-[#E1E7E3] bg-white shadow-sm xl:col-span-2">
                    <div className="flex items-center justify-between border-b border-[#E8ECEA] px-5 py-4">
                        <div>
                            <h2 className="text-sm font-bold text-[#18201C]">
                                Recent Tasks
                            </h2>
                            <p className="mt-0.5 text-xs text-[#6B7770]">
                                Your latest assigned work
                            </p>
                        </div>
                        <Link
                            href="/employee/tasks"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534] hover:text-[#14532D]"
                        >
                            View all <ArrowIcon />
                        </Link>
                    </div>

                    {recentTasks.length === 0 ? (
                        <div className="px-5 py-10 text-center">
                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#ECFDF3] text-[#166534]">
                                <TaskIcon />
                            </div>
                            <p className="mt-3 text-sm font-semibold text-[#18201C]">
                                No tasks found
                            </p>
                            <p className="mt-1 text-xs text-[#6B7770]">
                                Assigned tasks will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[#E8ECEA]">
                            {recentTasks.map((task) => (
                                <Link
                                    key={task.id}
                                    href={`/employee/tasks/${task.id}`}
                                    className="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-[#F7F9F8]"
                                >
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ECFDF3] text-[#166534]">
                                        <TaskIcon />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-[#18201C] group-hover:text-[#166534]">
                                            {task.title || "Untitled Task"}
                                        </p>
                                        <p className="mt-0.5 truncate text-[11px] text-[#6B7770]">
                                            {getTaskProjectName(task)}
                                        </p>
                                    </div>
                                    <div className="hidden items-center gap-2 sm:flex">
                                        <span
                                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${getPriorityClasses(task.priority)}`}
                                        >
                                            {task.priority || "Normal"}
                                        </span>
                                        <span
                                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${getStatusClasses(task.status)}`}
                                        >
                                            {normalizeStatus(task.status)}
                                        </span>
                                    </div>
                                    <ArrowIcon />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-[#E1E7E3] bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-[#E8ECEA] px-5 py-4">
                        <div>
                            <h2 className="text-sm font-bold text-[#18201C]">
                                Upcoming Tasks
                            </h2>
                            <p className="mt-0.5 text-xs text-[#6B7770]">
                                Deadlines to keep in mind
                            </p>
                        </div>
                        <ClockIcon />
                    </div>

                    {upcomingTasks.length === 0 ? (
                        <div className="px-5 py-10 text-center">
                            <p className="text-sm font-semibold text-[#18201C]">
                                No upcoming tasks
                            </p>
                            <p className="mt-1 text-xs text-[#6B7770]">
                                You are all caught up.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[#E8ECEA]">
                            {upcomingTasks.map((task) => (
                                <Link
                                    key={task.id}
                                    href={`/employee/tasks/${task.id}`}
                                    className="block px-5 py-3.5 transition hover:bg-[#F7F9F8]"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="line-clamp-2 text-xs font-semibold text-[#18201C]">
                                            {task.title || "Untitled Task"}
                                        </p>
                                        <span
                                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getPriorityClasses(task.priority)}`}
                                        >
                                            {task.priority || "Normal"}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between gap-3">
                                        <span className="truncate text-[11px] text-[#6B7770]">
                                            {getTaskProjectName(task)}
                                        </span>
                                        <span className="shrink-0 text-[11px] font-medium text-[#166534]">
                                            {formatDate(task.deadline)}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#E1E7E3] bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-[#E8ECEA] px-5 py-4">
                    <div>
                        <h2 className="text-sm font-bold text-[#18201C]">
                            Recent Daily Updates
                        </h2>
                        <p className="mt-0.5 text-xs text-[#6B7770]">
                            Your latest submitted work
                        </p>
                    </div>
                    <Link
                        href="/employee/daily-updates"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534] hover:text-[#14532D]"
                    >
                        View all <ArrowIcon />
                    </Link>
                </div>

                {recentUpdates.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                        <p className="text-sm font-semibold text-[#18201C]">
                            No daily updates yet
                        </p>
                        <p className="mt-1 text-xs text-[#6B7770]">
                            Submit your first daily update to start tracking your work.
                        </p>
                        <Link
                            href="/employee/daily-updates/create"
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#166534] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#14532D]"
                        >
                            <PlusIcon />
                            Create Update
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
                        {recentUpdates.map((update) => (
                            <Link
                                key={update.id}
                                href={`/employee/daily-updates/${update.id}`}
                                className="group rounded-xl border border-[#E1E7E3] p-4 transition hover:border-[#B8C9BE] hover:bg-[#F7F9F8]"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-medium text-[#6B7770]">
                                        {formatDate(update.update_date)}
                                    </span>
                                    <span
                                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${getStatusClasses(update.status)}`}
                                    >
                                        {normalizeStatus(update.status)}
                                    </span>
                                </div>
                                <h3 className="mt-3 line-clamp-1 text-xs font-semibold text-[#18201C] group-hover:text-[#166534]">
                                    {update.project?.title ||
                                        update.project?.name ||
                                        "Daily Work"}
                                </h3>
                                <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#6B7770]">
                                    {update.work_description ||
                                        "No description provided."}
                                </p>
                                <div className="mt-3 flex items-center justify-between border-t border-[#E8ECEA] pt-3">
                                    <span className="text-[11px] text-[#6B7770]">
                                        {update.hours_spent ?? 0} hrs
                                    </span>
                                    <span className="text-[11px] font-semibold text-[#166534]">
                                        View →
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            <section className="grid gap-3 sm:grid-cols-3">
                <Link
                    href="/employee/projects"
                    className="group flex items-center gap-3 rounded-xl border border-[#E1E7E3] bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[#B8C9BE] hover:shadow-md"
                >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ECFDF3] text-[#166534]">
                        <FolderIcon />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#18201C]">My Projects</p>
                        <p className="mt-0.5 text-[11px] text-[#6B7770]">
                            View assigned projects
                        </p>
                    </div>
                    <ArrowIcon />
                </Link>

                <Link
                    href="/employee/tasks"
                    className="group flex items-center gap-3 rounded-xl border border-[#E1E7E3] bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[#B8C9BE] hover:shadow-md"
                >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ECFDF3] text-[#166534]">
                        <TaskIcon />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#18201C]">My Tasks</p>
                        <p className="mt-0.5 text-[11px] text-[#6B7770]">
                            Manage assigned tasks
                        </p>
                    </div>
                    <ArrowIcon />
                </Link>

                <Link
                    href="/employee/daily-updates/create"
                    className="group flex items-center gap-3 rounded-xl border border-[#E1E7E3] bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[#B8C9BE] hover:shadow-md"
                >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#166534] text-white">
                        <PlusIcon />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#18201C]">
                            Submit Update
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#6B7770]">
                            Record today&apos;s work
                        </p>
                    </div>
                    <ArrowIcon />
                </Link>
            </section>
        </div>
    );
}
