"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type User = {
    id: number;
    name?: string;
    email?: string;
};

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
    update_date?: string | null;
    work_description?: string | null;
    description?: string | null;
    hours_spent?: number | string | null;
    status?: string | null;
    blocker_details?: string | null;
    has_blocker?: boolean | number | null;
    plans_for_tomorrow?: string | null;
    manager_comment?: string | null;
    reviewed_at?: string | null;
    attached_file?: string | null;
    employee?: User | null;
    project?: Project | null;
    task?: Task | null;
};

type ApiResponse = {
    message?: string;
    daily_update?: DailyUpdate;
    update?: DailyUpdate;
    data?: DailyUpdate | { data?: DailyUpdate };
};

function getToken(): string | null {
    if (typeof window === "undefined") {
        return null;
    }

    return localStorage.getItem("nexra_token");
}

function extractUpdate(response: ApiResponse): DailyUpdate | null {
    if (response.daily_update) {
        return response.daily_update;
    }

    if (response.update) {
        return response.update;
    }

    if (!response.data) {
        return null;
    }

    if (
        typeof response.data === "object" &&
        "data" in response.data &&
        response.data.data
    ) {
        return response.data.data;
    }

    return response.data as DailyUpdate;
}

function formatDate(value?: string | null): string {
    if (!value) {
        return "Not specified";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function formatDateTime(value?: string | null): string {
    if (!value) {
        return "Not available";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getProjectName(project?: Project | null): string {
    return project?.title || project?.name || "General Project";
}

function getStatusLabel(status?: string | null): string {
    if (!status) {
        return "Pending";
    }

    return status
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isReviewed(update: DailyUpdate): boolean {
    return (
        Boolean(update.reviewed_at) ||
        String(update.status || "").toLowerCase() === "reviewed"
    );
}

function hasBlocker(update: DailyUpdate): boolean {
    return (
        update.has_blocker === true ||
        update.has_blocker === 1 ||
        Boolean(update.blocker_details?.trim())
    );
}

export default function EmployeeDailyUpdateDetailsPage() {
    const params = useParams<{ id: string | string[] }>();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;

    const [update, setUpdate] = useState<DailyUpdate | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadUpdate = useCallback(async () => {
        if (!id) {
            setError("Daily update ID was not provided.");
            setLoading(false);
            return;
        }

        const token = getToken();

        if (!token) {
            setError("Your login session could not be found. Please log in again.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await apiFetch<ApiResponse>(
                `/employee/daily-updates/${encodeURIComponent(id)}`,
                { token }
            );

            const result = extractUpdate(response);

            if (!result) {
                throw new Error(
                    response.message ||
                        "The API response did not contain daily update details."
                );
            }

            setUpdate(result);
        } catch (requestError) {
            setUpdate(null);
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Unable to load the daily update."
            );
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void loadUpdate();
    }, [loadUpdate]);

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-5xl animate-pulse space-y-5">
                    <div className="h-5 w-48 rounded bg-slate-200" />
                    <div className="h-52 rounded-3xl bg-slate-200" />
                    <div className="h-64 rounded-3xl bg-white" />
                </div>
            </main>
        );
    }

    if (error || !update) {
        return (
            <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-2xl">
                    <Link
                        href="/employee/daily-updates"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
                    >
                        ← Back to My Daily Updates
                    </Link>

                    <div className="mt-6 rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-xl font-bold text-rose-600">
                            !
                        </div>

                        <h1 className="mt-4 text-xl font-bold text-slate-950">
                            Unable to load daily update
                        </h1>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                            {error || "The requested daily update could not be found."}
                        </p>

                        <button
                            type="button"
                            onClick={() => void loadUpdate()}
                            className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    const reviewed = isReviewed(update);
    const blocker = hasBlocker(update);
    const employeeName = update.employee?.name || "Employee";
    const projectName = getProjectName(update.project);
    const workDescription =
        update.work_description || update.description || "";

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl space-y-6">
                <Link
                    href="/employee/daily-updates"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
                >
                    ← Back to My Daily Updates
                </Link>

                <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-sm sm:p-8">
                    <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl" />

                    <div className="relative">
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200">
                                My Daily Update
                            </span>

                            <span
                                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                                    reviewed
                                        ? "bg-emerald-400/15 text-emerald-300"
                                        : "bg-amber-400/15 text-amber-300"
                                }`}
                            >
                                {reviewed ? "Reviewed" : "Pending Review"}
                            </span>

                            {blocker && (
                                <span className="rounded-full bg-rose-400/15 px-3 py-1.5 text-xs font-semibold text-rose-300">
                                    Has Blocker
                                </span>
                            )}
                        </div>

                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                            Daily Work Details
                        </h1>

                        <p className="mt-3 text-sm text-slate-300">
                            {formatDate(update.update_date)} · {projectName}
                        </p>

                        <div className="mt-7 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                <p className="text-xs text-slate-400">Status</p>
                                <p className="mt-1 text-sm font-semibold text-white">
                                    {getStatusLabel(update.status)}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                <p className="text-xs text-slate-400">Project</p>
                                <p className="mt-1 truncate text-sm font-semibold text-white">
                                    {projectName}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                <p className="text-xs text-slate-400">Hours Logged</p>
                                <p className="mt-1 text-sm font-semibold text-white">
                                    {update.hours_spent ?? 0} hours
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                    <h2 className="text-lg font-bold text-slate-950">
                        Work Accomplished
                    </h2>

                    <div className="mt-4 rounded-2xl bg-slate-50 p-5">
                        {workDescription ? (
                            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                                {workDescription}
                            </p>
                        ) : (
                            <p className="text-sm italic text-slate-400">
                                No work description was provided.
                            </p>
                        )}
                    </div>
                </section>

                {blocker && (
                    <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm sm:p-7">
                        <h2 className="text-lg font-bold text-slate-950">
                            Blocker or Issue
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Issue included in your submitted update.
                        </p>

                        <div className="mt-4 rounded-2xl bg-rose-50 p-5">
                            <p className="whitespace-pre-wrap text-sm leading-7 text-rose-900">
                                {update.blocker_details ||
                                    "A blocker was reported without additional details."}
                            </p>
                        </div>
                    </section>
                )}

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                    <h2 className="text-lg font-bold text-slate-950">
                        Tomorrow&apos;s Plan
                    </h2>

                    <div className="mt-4 rounded-2xl bg-slate-50 p-5">
                        {update.plans_for_tomorrow ? (
                            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                                {update.plans_for_tomorrow}
                            </p>
                        ) : (
                            <p className="text-sm italic text-slate-400">
                                No plan was provided.
                            </p>
                        )}
                    </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                    <h2 className="text-lg font-bold text-slate-950">
                        Update Information
                    </h2>

                    <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                        <div>
                            <dt className="text-xs font-semibold text-slate-400">
                                Submitted By
                            </dt>
                            <dd className="mt-1 text-sm font-semibold text-slate-800">
                                {employeeName}
                            </dd>
                            {update.employee?.email && (
                                <dd className="mt-1 text-xs text-slate-500">
                                    {update.employee.email}
                                </dd>
                            )}
                        </div>

                        <div>
                            <dt className="text-xs font-semibold text-slate-400">
                                Project
                            </dt>
                            <dd className="mt-1 text-sm font-semibold text-slate-800">
                                {projectName}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-xs font-semibold text-slate-400">
                                Task
                            </dt>
                            <dd className="mt-1 text-sm font-semibold text-slate-800">
                                {update.task?.title || "No specific task"}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-xs font-semibold text-slate-400">
                                Update Date
                            </dt>
                            <dd className="mt-1 text-sm font-semibold text-slate-800">
                                {formatDate(update.update_date)}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-xs font-semibold text-slate-400">
                                Hours Spent
                            </dt>
                            <dd className="mt-1 text-sm font-semibold text-slate-800">
                                {update.hours_spent ?? 0} hours
                            </dd>
                        </div>

                        <div>
                            <dt className="text-xs font-semibold text-slate-400">
                                Review Status
                            </dt>
                            <dd className="mt-1 text-sm font-semibold text-slate-800">
                                {reviewed ? "Reviewed" : "Awaiting review"}
                            </dd>
                            {update.reviewed_at && (
                                <dd className="mt-1 text-xs text-slate-500">
                                    Reviewed on {formatDateTime(update.reviewed_at)}
                                </dd>
                            )}
                        </div>
                    </dl>
                </section>

                {update.manager_comment && (
                    <section className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6 shadow-sm sm:p-7">
                        <h2 className="text-lg font-bold text-emerald-950">
                            Manager Feedback
                        </h2>

                        <p className="mt-1 text-sm text-emerald-800">
                            Feedback on your submitted work.
                        </p>

                        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-emerald-950">
                            {update.manager_comment}
                        </p>
                    </section>
                )}
            </div>
        </main>
    );
}