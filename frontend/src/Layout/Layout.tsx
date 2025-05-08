import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar/Sidebar';
import './Layout.scss';

export const Layout = () => {
    return (
        <div className="layout-container">
            <Sidebar />
            <main className="content">
                <Outlet /> {}
            </main>
        </div>
    );
};