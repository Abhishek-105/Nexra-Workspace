import type { Metadata } from "next";
import "./globals.css";

import { AuthProvider } from "../context/AuthContext";
import AppLayout from "../components/layout/AppLayout";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
    title: "Nexra Workspace",
    description:
        "Nexra Daily Work & Project Management",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>
                <AuthProvider>
                    <AppLayout>
                        {children}
                    </AppLayout>
                </AuthProvider>

                <SpeedInsights />
            </body>
        </html>
    );
}