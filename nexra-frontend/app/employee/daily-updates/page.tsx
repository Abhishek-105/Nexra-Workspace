
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Project = {
    id: number;
    title?: string;
    name?: string;
};

type Task = {
    id: number;
    title?: string;
};

type DailyUpdate = {
    id: number;
    employee_id?: number;
    project_id?: number | null;
    task_id?: number | null;
    update_date?: string | null;
    work_description?: string | null;
    hours_spent?: number | string | null;
    status?: string | null;
    attached_file?: string | null;
    blocker_details?: string | null;
    plans_for_tomorrow?: string | null;
    reviewed_by?: number | null;
    reviewed_at?: string | null;
    blocker_acknowledged_by?: number | null;
    blocker_acknowledged_at?: string | null;
    manager_comment?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    project?: Project | null;
    task?: Task | null;
};

type PaginationMeta = {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
};

type ApiResponse = {
    message?: string;
    daily_updates?: DailyUpdate[] | { data?: DailyUpdate[] };
    updates?: DailyUpdate[] | { data?: DailyUpdate[] };
    data?:
        | DailyUpdate[]
        | {
              data?: DailyUpdate[];
          };
    meta?: PaginationMeta;
};

type DateRange =
    | "today"
    | "yesterday"
    | "last_7_days"
    | "last_30_days"
    | "this_month"
    | "all_time";

const DATE_RANGE_OPTIONS: {
    value: DateRange;
    label: string;
}[] = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "last_7_days", label: "Last 7 Days" },
    { value: "last_30_days", label: "Last 30 Days" },
    { value: "this_month", label: "This Month" },
    { value: "all_time", label: "All Time" },
];

function extractUpdates(response: ApiResponse): DailyUpdate[] {
    if (Array.isArray(response.daily_updates)) {
        return response.daily_updates;
    }

    if (
        response.daily_updates &&
        typeof response.daily_updates === "object" &&
        Array.isArray(response.daily_updates.data)
    ) {
        return response.daily_updates.data;
    }

    if (Array.isArray(response.updates)) {
        return response.updates;
    }

    if (
        response.updates &&
        typeof response.updates === "object" &&
        Array.isArray(response.updates.data)
    ) {
        return response.updates.data;
    }

    if (Array.isArray(response.data)) {
        return response.data;
    }

    if (
        response.data &&
        typeof response.data === "object" &&
        Array.isArray(response.data.data)
    ) {
        return response.data.data;
    }

    return [];
}

function normalizeStatus(status?: string | null): string {
    if (!status) {
        return "pending";
    }

    return status.toLowerCase().replace(/[_-]/g, " ");
}

function getStatusClasses(status?: string | null): string {
    const normalized = normalizeStatus(status);

    if (
        normalized === "reviewed" ||
        normalized === "approved" ||
        normalized === "completed"
    ) {
        return "bg-[#ECFDF3] text-[#166534] ring-[#BBF7D0]";
    }

    if (
        normalized === "pending" ||
        normalized === "submitted"
    ) {
        return "bg-amber-50 text-amber-700 ring-amber-200";
    }

    if (
        normalized === "rejected" ||
        normalized === "declined"
    ) {
        return "bg-rose-50 text-rose-700 ring-rose-200";
    }

    return "bg-slate-100 text-slate-600 ring-slate-200";
}

function formatDate(date?: string | null): string {
    if (!date) {
        return "No date";
    }

    // Avoid timezone shifts when update_date is a YYYY-MM-DD value.
    const dateOnly = date.match(/^\d{4}-\d{2}-\d{2}$/);

    const parsed = dateOnly
        ? new Date(`${date}T12:00:00`)
        : new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return "No date";
    }

    return parsed.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function formatHours(hours?: number | string | null): string {
    if (
        hours === null ||
        hours === undefined ||
        hours === ""
    ) {
        return "0 hrs";
    }

    const value = Number(hours);

    if (Number.isNaN(value)) {
        return `${hours} hrs`;
    }

    return `${value} ${value === 1 ? "hr" : "hrs"}`;
}

function getProjectName(project?: Project | null): string {
    if (!project) {
        return "No project";
    }

    return project.title || project.name || "Untitled Project";
}

function hasBlocker(update: DailyUpdate): boolean {
    return Boolean(
        update.blocker_details &&
            update.blocker_details.trim()
    );
}

function isReviewed(update: DailyUpdate): boolean {
    const status = normalizeStatus(update.status);

    return (
        Boolean(update.reviewed_at) ||
        Boolean(update.reviewed_by) ||
        status === "reviewed" ||
        status === "approved"
    );
}

function ClipboardIcon({
    className = "h-5 w-5",
}: {
    className?: string;
}) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <rect
                x="6"
                y="5"
                width="12"
                height="16"
                rx="2"
            />
            <path
                strokeLinecap="round"
                d="M9 5V3h6v2M9 10h6M9 14h6M9 18h3"
            />
        </svg>
    );
}

function PlusIcon() {
    return (
        <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path
                strokeLinecap="round"
                d="M12 5v14M5 12h14"
            />
        </svg>
    );
}

function SearchIcon() {
    return (
        <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <circle cx="11" cy="11" r="7" />
            <path
                strokeLinecap="round"
                d="m20 20-4-4"
            />
        </svg>
    );
}

function ArrowIcon() {
    return (
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
                d="m9 5 7 7-7 7"
            />
        </svg>
    );
}

function AlertIcon() {
    return (
        <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.29 3.86l-7.82 14a2 2 0 001.74 2.98h15.58a2 2 0 001.74-2.98l-7.82-14a2 2 0 00-3.42 0z"
            />
        </svg>
    );
}

function Pagination({
    currentPage,
    lastPage,
    onPageChange,
}: {
    currentPage: number;
    lastPage: number;
    onPageChange: (page: number) => void;
}) {
    if (lastPage <= 1) {
        return null;
    }

    return (
        <div className="flex flex-col gap-3 border-t border-[#E8EDEA] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs text-[#6B7770]">
                Page{" "}
                <span className="font-bold text-[#18201C]">
                    {currentPage}
                </span>{" "}
                of{" "}
                <span className="font-bold text-[#18201C]">
                    {lastPage}
                </span>
            </p>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="rounded-lg border border-[#E1E7E3] px-3 py-2 text-xs font-semibold text-[#37443C] transition hover:bg-[#F5F7F6] disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Previous
                </button>

                <button
                    type="button"
                    disabled={currentPage >= lastPage}
                    onClick={() => onPageChange(currentPage + 1)}
                    className="rounded-lg bg-[#166534] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#14532D] disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Next
                </button>
            </div>
        </div>
    );
}

export default function EmployeeDailyUpdatesPage() {
    const [updates, setUpdates] = useState<DailyUpdate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [blockerFilter, setBlockerFilter] = useState("all");

    const [dateRange, setDateRange] = useState<DateRange>("all_time");
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState<PaginationMeta>({
        current_page: 1,
        last_page: 1,
        per_page: 15,
        total: 0,
    });

    const getToken = () => {
        if (typeof window === "undefined") {
            return null;
        }

        return localStorage.getItem("nexra_token");
    };

    const loadUpdates = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const token = getToken();

            if (!token) {
                throw new Error(
                    "Authentication session not found. Please log in again."
                );
            }

            const params = new URLSearchParams({
                date_range: dateRange,
                page: String(currentPage),
                per_page: "15",
            });

            const response = await apiFetch<ApiResponse>(
                `/employee/daily-updates?${params.toString()}`,
                { token }
            );

            setUpdates(extractUpdates(response));

            setPagination({
                current_page:
                    response.meta?.current_page ?? currentPage,
                last_page: response.meta?.last_page ?? 1,
                per_page: response.meta?.per_page ?? 15,
                total: response.meta?.total ?? extractUpdates(response).length,
            });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load daily updates."
            );
        } finally {
            setLoading(false);
        }
    }, [dateRange, currentPage]);

    useEffect(() => {
        loadUpdates();
    }, [loadUpdates]);

    const handleDateRangeChange = (
        value: DateRange
    ) => {
        setDateRange(value);
        setCurrentPage(1);
    };

    const filteredUpdates = useMemo(() => {
        const searchTerm = search.trim().toLowerCase();

        return updates.filter((update) => {
            const workDescription =
                update.work_description?.toLowerCase() || "";

            const projectName =
                getProjectName(update.project).toLowerCase();

            const taskName =
                update.task?.title?.toLowerCase() || "";

            const blocker =
                update.blocker_details?.toLowerCase() || "";

            const matchesSearch =
                !searchTerm ||
                workDescription.includes(searchTerm) ||
                projectName.includes(searchTerm) ||
                taskName.includes(searchTerm) ||
                blocker.includes(searchTerm);

            const normalizedStatus =
                normalizeStatus(update.status);

            const matchesStatus =
                statusFilter === "all" ||
                normalizedStatus === statusFilter;

            const matchesBlocker =
                blockerFilter === "all" ||
                (blockerFilter === "yes" &&
                    hasBlocker(update)) ||
                (blockerFilter === "no" &&
                    !hasBlocker(update));

            return (
                matchesSearch &&
                matchesStatus &&
                matchesBlocker
            );
        });
    }, [
        updates,
        search,
        statusFilter,
        blockerFilter,
    ]);

    // The backend total covers every matching record in the selected date range.
    const totalCount = pagination.total ?? updates.length;

    // These statistics describe the currently loaded API page.
    const reviewedCount = updates.filter((update) =>
        isReviewed(update)
    ).length;

    const pendingCount = updates.filter(
        (update) => !isReviewed(update)
    ).length;

    const blockerCount = updates.filter((update) =>
        hasBlocker(update)
    ).length;

    const totalHours = updates.reduce(
        (total, update) => {
            const hours = Number(update.hours_spent);

            return Number.isNaN(hours)
                ? total
                : total + hours;
        },
        0
    );

    const firstVisibleRecord =
        totalCount === 0
            ? 0
            : (currentPage - 1) * (pagination.per_page ?? 15) + 1;

    const lastVisibleRecord = Math.min(
        currentPage * (pagination.per_page ?? 15),
        totalCount
    );

    if (loading) {
        return (
            <main className="min-h-screen bg-[#F5F7F6] p-3 sm:p-4 lg:p-5">
                <div className="mx-auto max-w-7xl space-y-4">
                    <div className="h-36 animate-pulse rounded-2xl bg-[#171A19]" />

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[1, 2, 3, 4].map((item) => (
                            <div
                                key={item}
                                className="h-24 animate-pulse rounded-2xl border border-[#E1E7E3] bg-white"
                            />
                        ))}
                    </div>

                    <div className="rounded-2xl border border-[#E1E7E3] bg-white p-4 shadow-sm">
                        <div className="h-10 animate-pulse rounded-xl bg-[#F5F7F6]" />

                        <div className="mt-4 space-y-3">
                            {[1, 2, 3].map((item) => (
                                <div
                                    key={item}
                                    className="h-28 animate-pulse rounded-xl bg-[#F5F7F6]"
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="min-h-screen bg-[#F5F7F6] p-3 sm:p-4 lg:p-5">
                <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
                    <div className="w-full rounded-2xl border border-[#E1E7E3] bg-white p-8 text-center shadow-sm">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                            <AlertIcon />
                        </div>

                        <h1 className="mt-4 text-xl font-bold text-[#18201C]">
                            Unable to load daily updates
                        </h1>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6B7770]">
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={loadUpdates}
                            className="mt-5 rounded-xl bg-[#166534] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#14532D]"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#F5F7F6] p-3 sm:p-4 lg:p-5">
            <div className="mx-auto max-w-7xl space-y-4">
                {/* Header */}
                <section className="relative overflow-hidden rounded-2xl bg-[#171A19] shadow-sm">
                    <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#166534]/20 blur-3xl" />
                    <div className="absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-[#22C55E]/10 blur-3xl" />

                    <div className="relative px-5 py-5 sm:px-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 text-xs font-medium text-[#A4AEA8]">
                                    <span>Workspace</span>
                                    <span className="text-[#657169]">/</span>
                                    <span className="text-[#D6DDD9]">
                                        Daily Updates
                                    </span>
                                </div>

                                <div className="mt-3 flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#166534] text-white shadow-lg shadow-black/20">
                                        <ClipboardIcon className="h-5 w-5" />
                                    </div>

                                    <div>
                                        <h1 className="text-2xl font-black tracking-tight text-white">
                                            My Daily Updates
                                        </h1>

                                        <p className="mt-0.5 text-xs text-[#A4AEA8] sm:text-sm">
                                            Track your work, hours, blockers
                                            and manager feedback.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Link
                                href="/employee/daily-updates/create"
                                className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#22C55E] px-4 py-2.5 text-sm font-bold text-[#082D16] shadow-lg shadow-black/20 transition hover:bg-[#4ADE80]"
                            >
                                <PlusIcon />
                                Submit Update
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Date Range */}
                <section className="flex flex-col gap-3 rounded-2xl border border-[#E1E7E3] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-[#18201C]">
                            Reporting Period
                        </h2>
                        <p className="mt-0.5 text-xs text-[#6B7770]">
                            Choose the period for your update history.
                        </p>
                    </div>

                    <select
                        value={dateRange}
                        onChange={(event) =>
                            handleDateRangeChange(
                                event.target.value as DateRange
                            )
                        }
                        className="h-10 w-full rounded-xl border border-[#E1E7E3] bg-[#F5F7F6] px-3 text-sm font-semibold text-[#18201C] outline-none transition focus:border-[#166534] focus:bg-white sm:w-56"
                    >
                        {DATE_RANGE_OPTIONS.map((option) => (
                            <option
                                key={option.value}
                                value={option.value}
                            >
                                {option.label}
                            </option>
                        ))}
                    </select>
                </section>

                {/* Statistics */}
                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-[#E1E7E3] bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-[#8A958F]">
                                    Total Updates
                                </p>
                                <p className="mt-1.5 text-2xl font-black text-[#18201C]">
                                    {totalCount}
                                </p>
                                <p className="mt-0.5 text-xs text-[#6B7770]">
                                    In selected period
                                </p>
                            </div>

                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ECFDF3] text-[#166534]">
                                <ClipboardIcon className="h-4 w-4" />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[#E1E7E3] bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-[#8A958F]">
                                    Reviewed
                                </p>
                                <p className="mt-1.5 text-2xl font-black text-[#166534]">
                                    {reviewedCount}
                                </p>
                                <p className="mt-0.5 text-xs text-[#6B7770]">
                                    On this page
                                </p>
                            </div>

                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ECFDF3] text-[#166534]">
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
                                        d="m5 12 4 4L19 6"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[#E1E7E3] bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-[#8A958F]">
                                    Pending
                                </p>
                                <p className="mt-1.5 text-2xl font-black text-amber-600">
                                    {pendingCount}
                                </p>
                                <p className="mt-0.5 text-xs text-[#6B7770]">
                                    On this page
                                </p>
                            </div>

                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                                <svg
                                    className="h-4 w-4"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                >
                                    <circle cx="12" cy="12" r="8" />
                                    <path
                                        strokeLinecap="round"
                                        d="M12 8v4l2.5 1.5"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[#E1E7E3] bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-[#8A958F]">
                                    Logged Hours
                                </p>
                                <p className="mt-1.5 text-2xl font-black text-[#18201C]">
                                    {totalHours}
                                </p>
                                <p className="mt-0.5 text-xs text-[#6B7770]">
                                    On this page
                                </p>
                            </div>

                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ECFDF3] text-[#166534]">
                                <svg
                                    className="h-4 w-4"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                >
                                    <circle cx="12" cy="12" r="8" />
                                    <path
                                        strokeLinecap="round"
                                        d="M12 8v4l2.5 1.5"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Blocker Alert */}
                {blockerCount > 0 && (
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <div className="mt-0.5 shrink-0 text-amber-600">
                            <AlertIcon />
                        </div>

                        <div>
                            <p className="text-sm font-bold text-amber-800">
                                {blockerCount} update
                                {blockerCount === 1 ? "" : "s"} on this page
                                contain blocker information.
                            </p>
                            <p className="mt-0.5 text-xs text-amber-700">
                                Open an update to review the blocker and any
                                manager response.
                            </p>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <section className="rounded-2xl border border-[#E1E7E3] bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-bold text-[#18201C]">
                                Update History
                            </p>
                            <p className="mt-0.5 text-xs text-[#6B7770]">
                                Search and filter updates on the current page.
                            </p>
                        </div>

                        {(search ||
                            statusFilter !== "all" ||
                            blockerFilter !== "all") && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch("");
                                    setStatusFilter("all");
                                    setBlockerFilter("all");
                                }}
                                className="shrink-0 text-xs font-bold text-[#166534] transition hover:text-[#14532D]"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[1fr_190px_190px]">
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A958F]">
                                <SearchIcon />
                            </span>

                            <input
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search project, task, work or blocker..."
                                className="h-10 w-full rounded-xl border border-[#E1E7E3] bg-[#F5F7F6] pl-10 pr-4 text-sm text-[#18201C] outline-none transition placeholder:text-[#8A958F] focus:border-[#166534] focus:bg-white focus:ring-4 focus:ring-[#ECFDF3]"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value)
                            }
                            className="h-10 rounded-xl border border-[#E1E7E3] bg-[#F5F7F6] px-3 text-sm font-medium text-[#18201C] outline-none transition focus:border-[#166534] focus:bg-white"
                        >
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="submitted">Submitted</option>
                            <option value="in progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="blocked">Blocked</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>

                        <select
                            value={blockerFilter}
                            onChange={(event) =>
                                setBlockerFilter(event.target.value)
                            }
                            className="h-10 rounded-xl border border-[#E1E7E3] bg-[#F5F7F6] px-3 text-sm font-medium text-[#18201C] outline-none transition focus:border-[#166534] focus:bg-white"
                        >
                            <option value="all">All Updates</option>
                            <option value="yes">Has Blocker</option>
                            <option value="no">No Blocker</option>
                        </select>
                    </div>
                </section>

                {/* Updates */}
                <section className="overflow-hidden rounded-2xl border border-[#E1E7E3] bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-[#E8EDEA] px-4 py-3.5 sm:px-5">
                        <div>
                            <h2 className="text-base font-bold text-[#18201C]">
                                Submitted Updates
                            </h2>
                            <p className="mt-0.5 text-xs text-[#6B7770]">
                                {filteredUpdates.length}{" "}
                                {filteredUpdates.length === 1
                                    ? "matching update"
                                    : "matching updates"}{" "}
                                on this page
                            </p>
                        </div>

                        <div className="hidden h-8 items-center rounded-lg bg-[#F5F7F6] px-3 text-xs font-semibold text-[#6B7770] sm:flex">
                            {totalCount} total
                        </div>
                    </div>

                    {filteredUpdates.length === 0 ? (
                        <div className="px-5 py-14 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ECFDF3] text-[#166534]">
                                <ClipboardIcon className="h-7 w-7" />
                            </div>

                            <h3 className="mt-4 font-bold text-[#18201C]">
                                {totalCount === 0
                                    ? "No daily updates in this period"
                                    : "No matching updates on this page"}
                            </h3>

                            <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-[#6B7770]">
                                {totalCount === 0
                                    ? "Try another date range or submit a new daily update."
                                    : "Try changing your search or filters, or move to another page."}
                            </p>

                            {totalCount === 0 && (
                                <Link
                                    href="/employee/daily-updates/create"
                                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#166534] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#14532D]"
                                >
                                    <PlusIcon />
                                    Submit Daily Update
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-[#E8EDEA]">
                            {filteredUpdates.map((update) => (
                                <Link
                                    key={update.id}
                                    href={`/employee/daily-updates/${update.id}`}
                                    className="group block px-4 py-4 transition hover:bg-[#F8FAF9] sm:px-5"
                                >
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A958F]">
                                                    {formatDate(
                                                        update.update_date
                                                    )}
                                                </span>

                                                <span
                                                    className={`rounded-full px-2 py-1 text-[10px] font-bold capitalize ring-1 ${getStatusClasses(
                                                        update.status
                                                    )}`}
                                                >
                                                    {normalizeStatus(
                                                        update.status
                                                    )}
                                                </span>

                                                {hasBlocker(update) && (
                                                    <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                                                        Has Blocker
                                                    </span>
                                                )}

                                                {isReviewed(update) && (
                                                    <span className="rounded-full bg-[#ECFDF3] px-2 py-1 text-[10px] font-bold text-[#166534] ring-1 ring-[#BBF7D0]">
                                                        Reviewed
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-2.5 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                                                <h3 className="truncate text-sm font-bold text-[#18201C]">
                                                    {getProjectName(
                                                        update.project
                                                    )}
                                                </h3>

                                                {update.task?.title && (
                                                    <>
                                                        <span className="hidden text-[#B0BAB5] sm:inline">
                                                            •
                                                        </span>
                                                        <p className="truncate text-xs font-semibold text-[#6B7770]">
                                                            Task:{" "}
                                                            {update.task.title}
                                                        </p>
                                                    </>
                                                )}
                                            </div>

                                            <p className="mt-2 line-clamp-2 max-w-4xl text-sm leading-5 text-[#5F6B64]">
                                                {update.work_description ||
                                                    "No work description provided."}
                                            </p>

                                            {update.manager_comment && (
                                                <div className="mt-3 max-w-3xl rounded-xl border border-[#D9E8DF] bg-[#F4FAF6] px-3.5 py-2.5">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#166534]">
                                                        Manager Comment
                                                    </p>
                                                    <p className="mt-0.5 line-clamp-1 text-xs leading-5 text-[#36533F]">
                                                        {update.manager_comment}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex shrink-0 items-center justify-between gap-5 border-t border-[#E8EDEA] pt-3 lg:min-w-[170px] lg:border-t-0 lg:pt-0">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                                                    Hours
                                                </p>
                                                <p className="mt-0.5 text-sm font-bold text-[#18201C]">
                                                    {formatHours(
                                                        update.hours_spent
                                                    )}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#8A958F] transition group-hover:text-[#166534]">
                                                View Details
                                                <ArrowIcon />
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {totalCount > 0 && (
                        <Pagination
                            currentPage={pagination.current_page ?? currentPage}
                            lastPage={pagination.last_page ?? 1}
                            onPageChange={setCurrentPage}
                        />
                    )}

                    {totalCount > 0 && (
                        <div className="border-t border-[#E8EDEA] px-4 py-3 text-center text-xs text-[#6B7770] sm:px-5">
                            Showing {firstVisibleRecord}–{lastVisibleRecord} of{" "}
                            {totalCount} updates for{" "}
                            {
                                DATE_RANGE_OPTIONS.find(
                                    (option) => option.value === dateRange
                                )?.label
                            }
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
