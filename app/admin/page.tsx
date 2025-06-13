'use client'; // Required for useState and event handlers

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { NotificationConfigModal } from '@/components/admin/NotificationConfigModal'; // Verify path is correct
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

const AdminPage: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // In a real app, you'd protect this page based on user role from a context or session.
    // For example:
    // const { currentUser, isLoading } = useAuth(); // Assuming a custom auth hook
    // if (isLoading) return <p>Loading...</p>;
    // if (currentUser?.role !== UserRole.ADMIN) {
    //     return <p>Access Denied. You must be an administrator to view this page.</p>;
    // }

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center">
                    <ShieldCheck className="mr-3 h-8 w-8 text-primary" />
                    Administration Panel
                </h1>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                    Manage system settings and configurations.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <CardHeader>
                        <CardTitle className="text-xl">Notification Rules</CardTitle>
                        <CardDescription className="text-sm">
                            Configure rules for triggering system alarms and notifications based on data point values.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={() => setIsModalOpen(true)}
                            className="w-full md:w-auto"
                            variant="outline"
                        >
                            Configure Notifications
                        </Button>
                    </CardContent>
                </Card>

                {/* Placeholder for other admin sections */}
                <Card className="shadow-lg">
                     <CardHeader>
                        <CardTitle className="text-xl">User Management (Placeholder)</CardTitle>
                        <CardDescription className="text-sm">
                            View and manage user accounts and roles.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button disabled variant="secondary" className="w-full md:w-auto">Manage Users (Not Implemented)</Button>
                    </CardContent>
                </Card>

                <Card className="shadow-lg">
                     <CardHeader>
                        <CardTitle className="text-xl">System Logs (Placeholder)</CardTitle>
                        <CardDescription className="text-sm">
                            Access and review system operational logs.
                        </Description>
                    </CardHeader>
                    <CardContent>
                        <Button disabled variant="secondary" className="w-full md:w-auto">View Logs (Not Implemented)</Button>
                    </CardContent>
                </Card>
            </div>

            <NotificationConfigModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
};

export default AdminPage;