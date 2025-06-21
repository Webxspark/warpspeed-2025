import React from 'react';
import AdminLayout from '@/layouts/admin-layout';
import { ROUTES } from '@/constants/routes';
import { Head } from '@inertiajs/react';

const Index = () => {
    return (
        <AdminLayout
            breadcrumbs={[
                {
                    title: "Dashboard",
                    href: ROUTES.dashboard
                },
                {
                    title: "Session Insights",
                    href: ROUTES.moms
                }
            ]}
        >
            <Head title={'Session Insights'} />
        </AdminLayout>
    );
};

export default Index;
