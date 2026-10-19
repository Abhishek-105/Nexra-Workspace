"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Project = {
    id: number;
    title?: string;
    name?: string;
    description?: string | null;
    status?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
};

type ApiResponse = {
    message?: string;
    projects?:
        | Project[]
        | {
              data?: Project[];
          };
    data?:
        | Project[]
        | {
              data?: Project[];
          };
};

const getToken = () => {
    if (typeof window === "undefined") {
        return null;
    }

    return localStorage.getItem("nexra_token");
};

const extractProjects = (response: ApiResponse): Project[] => {
    if (Array.isArray(response.projects)) {
        return response.projects;
    }

    if (
        response.projects &&
        Array.isArray(response.projects.data)
    ) {
        return response.projects.data;
    }

    if (Array.isArray(response.data)) {
        return response.data;
    }

    if (
        response.data &&
        Array.isArray(response.data.data)
    ) {
        return response.data.data;
    }

    return [];
};

const getProjectName = (project: Project) => {
    return project.title || project.name || "Untitled Project";
};

const normalizeStatus = (status?: string | null) => {
    if (!status) {
        return "Unknown";
    }

    return status
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getStatusClasses = (status?: string | null) => {
    const normalized = status?.toLowerCase() || "";

    if (
        normalized === "active" ||
        normalized === "in progress" ||
        normalized === "in_progress"
    ) {
        return "bg-[#ECFDF3] text-[#166534]";
    }

    if (
        normalized === "completed" ||
        normalized === "complete" ||
        normalized === "done"
    ) {
        return "bg-slate-100 text-slate-700";
    }

    if (
        normalized === "on-hold" ||
        normalized === "on hold"
    ) {
        return "bg-amber-50 text-amber-700";
    }

    return "bg-slate-100 text-slate-600";
};

const formatDate = (value?: string | null) => {
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
};

const FolderIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75A2.25 2.25 0 0 1 6 4.5h4.1l1.8 2.25H18A2.25 2.25 0 0 1 20.25 9v8.25A2.25 2.25 0 0 1 18 19.5H6a2.25 2.25 0 0 1-2.25-2.25V6.75Z"
        />
    </svg>
);

const CheckIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-5 w-5"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m5 12 4 4L19 6"
        />
    </svg>
);

const ClockIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
    >
        <circle cx="12" cy="12" r="8.5" />
        <path
            strokeLinecap="round"
            d="M12 7.5v5l3 1.75"
        />
    </svg>
);

const SearchIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-4 w-4"
    >
        <circle cx="10.8" cy="10.8" r="6.3" />
        <path
            strokeLinecap="round"
            d="m16 16 4.2 4.2"
        />
    </svg>
);

const ArrowIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-4 w-4"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 12h13M13 6l6 6-6 6"
        />
    </svg>
);

export default function EmployeeProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadProjects = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const token = getToken();

            if (!token) {
                throw new Error(
                    "Authentication session not found. Please log in again."
                );
            }

            const response = await apiFetch<ApiResponse>(
                "/employee/projects",
                { token }
            );

            setProjects(extractProjects(response));
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load your projects."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadProjects();
    }, [loadProjects]);

    const filteredProjects = useMemo(() => {
        const query = search.trim().toLowerCase();

        return projects.filter((project) => {
            const projectName = getProjectName(project).toLowerCase();
            const description = project.description?.toLowerCase() || "";

            const matchesSearch =
                !query ||
                projectName.includes(query) ||
                description.includes(query);

            const matchesStatus =
                statusFilter === "all" ||
                project.status?.toLowerCase() ===
                    statusFilter.toLowerCase();

            return matchesSearch && matchesStatus;
        });
    }, [projects, search, statusFilter]);

    const activeCount = projects.filter((project) => {
        const status = project.status?.toLowerCase();

        return (
            status === "active" ||
            status === "in progress" ||
            status === "in_progress"
        );
    }).length;

    const completedCount = projects.filter((project) => {
        const status = project.status?.toLowerCase();

        return (
            status === "completed" ||
            status === "complete" ||
            status === "done"
        );
    }).length;

    const onHoldCount = projects.filter((project) => {
        const status = project.status?.toLowerCase();

        return status === "on-hold" || status === "on hold";
    }).length;

    if (loading) {
        return (
            <main className="min-h-screen bg-[#F5F7F6] p-4 sm:p-5 lg:p-6">
                <div className="mx-auto max-w-7xl animate-pulse space-y-6">
                    <div className="h-32 rounded-2xl bg-[#DDE4DF]" />

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div
                                key={index}
                                className="min-h-[120px] rounded-2xl bg-white"
                            />
                        ))}
                    </div>

                    <div className="h-20 rounded-2xl bg-white" />

                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div
                                key={index}
                                className="min-h-[280px] rounded-2xl bg-white"
                            />
                        ))}
                    </div>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="min-h-screen bg-[#F5F7F6] p-4 sm:p-5 lg:p-6">
                <div className="mx-auto max-w-3xl">
                    <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-lg font-bold text-red-600">
                            !
                        </div>

                        <h1 className="mt-5 text-lg font-bold text-[#18201C]">
                            Unable to load projects
                        </h1>

                        <p className="mt-2 text-sm leading-6 text-[#6B7770]">
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={() => void loadProjects()}
                            className="mt-6 rounded-xl bg-[#166534] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#14532D]"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#F5F7F6] p-4 pt-3 sm:p-5 sm:pt-4 lg:p-6 lg:pt-4">
            <div className="mx-auto max-w-7xl space-y-6">
                {/* Page header */}
                <section className="relative overflow-hidden rounded-2xl bg-[#171A19] px-6 py-6 shadow-sm sm:px-7">
                    <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#166534]/20 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-[#22C55E]/10 blur-3xl" />

                    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-[#8C9891]">
                                <span>Workspace</span>
                                <span className="text-[#4E5953]">/</span>
                                <span className="text-[#D4DBD7]">
                                    Projects
                                </span>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#166534] text-white shadow-lg shadow-black/20">
                                    <FolderIcon />
                                </div>

                                <div className="min-w-0">
                                    <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                                        My Projects
                                    </h1>

                                    <p className="mt-1.5 text-sm leading-5 text-[#A4AEA8]">
                                        Review your assigned projects, timelines, and current status.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Link
                            href="/employee/tasks"
                            className="inline-flex w-fit shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                        >
                            View My Tasks
                            <ArrowIcon />
                        </Link>
                    </div>
                </section>

                {/* Project statistics */}
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex min-h-[120px] items-center justify-between gap-4 rounded-2xl border border-[#E1E7E3] bg-white p-5 shadow-sm">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#7A857F]">
                                Total Projects
                            </p>
                            <p className="mt-3 text-2xl font-bold leading-none tracking-tight text-[#18201C]">
                                {projects.length}
                            </p>
                        </div>

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ECFDF3] text-[#166534]">
                            <FolderIcon />
                        </div>
                    </div>

                    <div className="flex min-h-[120px] items-center justify-between gap-4 rounded-2xl border border-[#E1E7E3] bg-white p-5 shadow-sm">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#7A857F]">
                                Active
                            </p>
                            <p className="mt-3 text-2xl font-bold leading-none tracking-tight text-[#18201C]">
                                {activeCount}
                            </p>
                        </div>

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ECFDF3] text-[#166534]">
                            <CheckIcon />
                        </div>
                    </div>

                    <div className="flex min-h-[120px] items-center justify-between gap-4 rounded-2xl border border-[#E1E7E3] bg-white p-5 shadow-sm">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#7A857F]">
                                Completed
                            </p>
                            <p className="mt-3 text-2xl font-bold leading-none tracking-tight text-[#18201C]">
                                {completedCount}
                            </p>
                        </div>

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <CheckIcon />
                        </div>
                    </div>

                    <div className="flex min-h-[120px] items-center justify-between gap-4 rounded-2xl border border-[#E1E7E3] bg-white p-5 shadow-sm">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#7A857F]">
                                On Hold
                            </p>
                            <p className="mt-3 text-2xl font-bold leading-none tracking-tight text-[#18201C]">
                                {onHoldCount}
                            </p>
                        </div>

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                            <ClockIcon />
                        </div>
                    </div>
                </section>

                {/* Search and status filter */}
                <section className="rounded-2xl border border-[#E1E7E3] bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                        <div className="relative min-w-0 flex-1">
                            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8A958F]">
                                <SearchIcon />
                            </span>

                            <input
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search projects..."
                                className="w-full rounded-xl border border-[#E1E7E3] bg-[#F5F7F6] py-3 pl-11 pr-4 text-sm text-[#18201C] outline-none transition placeholder:text-[#8A958F] focus:border-[#166534] focus:bg-white focus:ring-2 focus:ring-[#166534]/10"
                            />
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(event.target.value)
                            }
                            className="w-full rounded-xl border border-[#E1E7E3] bg-[#F5F7F6] px-4 py-3 text-sm font-medium text-[#36413B] outline-none transition focus:border-[#166534] focus:bg-white focus:ring-2 focus:ring-[#166534]/10 lg:w-48"
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="on-hold">On Hold</option>
                        </select>

                        {(search || statusFilter !== "all") && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch("");
                                    setStatusFilter("all");
                                }}
                                className="rounded-xl border border-[#E1E7E3] px-5 py-3 text-sm font-semibold text-[#59645E] transition hover:bg-[#F5F7F6]"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#E8ECEA] pt-4 text-xs text-[#8A958F]">
                        <span>
                            Showing{" "}
                            <span className="font-bold text-[#36413B]">
                                {filteredProjects.length}
                            </span>{" "}
                            of{" "}
                            <span className="font-bold text-[#36413B]">
                                {projects.length}
                            </span>{" "}
                            projects
                        </span>

                        {(search || statusFilter !== "all") && (
                            <span className="font-medium text-[#166534]">
                                Filters applied
                            </span>
                        )}
                    </div>
                </section>

                {/* Empty state or project cards */}
                {filteredProjects.length === 0 ? (
                    <section className="rounded-2xl border border-[#E1E7E3] bg-white px-6 py-14 text-center shadow-sm">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#ECFDF3] text-[#166534]">
                            <FolderIcon />
                        </div>

                        <h2 className="mt-5 text-base font-bold text-[#18201C]">
                            {projects.length === 0
                                ? "No projects assigned"
                                : "No projects found"}
                        </h2>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6B7770]">
                            {projects.length === 0
                                ? "Projects assigned to you by your manager will appear here."
                                : "Try changing your search or status filter."}
                        </p>

                        {projects.length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch("");
                                    setStatusFilter("all");
                                }}
                                className="mt-6 rounded-xl bg-[#166534] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#14532D]"
                            >
                                Reset Filters
                            </button>
                        )}
                    </section>
                ) : (
                    <section className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {filteredProjects.map((project) => (
                            <Link
                                key={project.id}
                                href={`/employee/projects/${project.id}`}
                                className="group flex min-h-[285px] flex-col overflow-hidden rounded-2xl border border-[#E1E7E3] bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#C8D4CD] hover:shadow-md"
                            >
                                <div className="h-1 shrink-0 bg-[#166534]" />

                                <div className="flex flex-1 flex-col p-5 sm:p-6">
                                    {/* Project title and status */}
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ECFDF3] text-[#166534] transition group-hover:bg-[#166534] group-hover:text-white">
                                            <FolderIcon />
                                        </div>

                                        <div className="min-w-0 flex-1 pt-0.5">
                                            <h2 className="break-words text-base font-bold leading-6 tracking-tight text-[#18201C] transition group-hover:text-[#166534]">
                                                {getProjectName(project)}
                                            </h2>

                                            <div className="mt-3">
                                                <span
                                                    className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${getStatusClasses(
                                                        project.status
                                                    )}`}
                                                >
                                                    {normalizeStatus(project.status)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Project description */}
                                    <p className="mt-5 line-clamp-3 min-h-[60px] text-sm leading-5 text-[#6B7770]">
                                        {project.description ||
                                            "No project description available."}
                                    </p>

                                    {/* Project dates */}
                                    <div className="mt-auto grid grid-cols-2 gap-4 border-t border-[#E8EEEA] pt-5">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                                                Start Date
                                            </p>

                                            <p className="mt-2 break-words text-sm font-semibold text-[#36413B]">
                                                {formatDate(project.start_date)}
                                            </p>
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A958F]">
                                                End Date
                                            </p>

                                            <p className="mt-2 break-words text-sm font-semibold text-[#36413B]">
                                                {formatDate(project.end_date)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Card footer */}
                                <div className="flex items-center justify-between gap-3 border-t border-[#E8EEEA] bg-[#F8FAF9] px-5 py-4 sm:px-6">
                                    <span className="text-xs font-medium text-[#6B7770]">
                                        View project details
                                    </span>

                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#6B7770] transition group-hover:bg-[#ECFDF3] group-hover:text-[#166534]">
                                        <ArrowIcon />
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </section>
                )}
            </div>
        </main>
    );
}