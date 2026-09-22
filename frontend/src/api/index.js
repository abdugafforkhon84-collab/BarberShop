/**
 * api/index.js
 * ------------------------------------------------------------
 * Thin wrapper functions around the axios client, grouped by
 * domain, so pages call e.g. `authApi.login(...)` instead of
 * building URLs by hand everywhere.
 * ------------------------------------------------------------
 */
import client from './client';

// ---------------------------------------------------------------- Auth
export const authApi = {    login: (login, password) => {
        const form = new URLSearchParams();
        form.append('username', login);
        form.append('password', password);
        return client.post('/auth/login', form, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }).then((r) => r.data);
    },
    me: () => client.get('/auth/me').then((r) => r.data),
};

// ---------------------------------------------------------------- Services
export const servicesApi = {
    list: () => client.get('/services').then((r) => r.data),
    create: (data) => client.post('/services', data).then((r) => r.data),
    update: (id, data) => client.put(`/services/${id}`, data).then((r) => r.data),
    remove: (id) => client.delete(`/services/${id}`).then((r) => r.data),
};

// ---------------------------------------------------------------- Admin: barbers
export const barbersApi = {
    list: () => client.get('/admin/barbers').then((r) => r.data),
    create: (data) => client.post('/admin/barbers', data).then((r) => r.data),
    update: (id, data) => client.put(`/admin/barbers/${id}`, data).then((r) => r.data),
    remove: (id) => client.delete(`/admin/barbers/${id}`).then((r) => r.data),
};

// ---------------------------------------------------------------- Admin: bookings
export const adminBookingsApi = {
    list: (params) => client.get('/admin/bookings', { params }).then((r) => r.data),
    create: (data) => client.post('/admin/bookings', data).then((r) => r.data),
    update: (id, data) => client.put(`/admin/bookings/${id}`, data).then((r) => r.data),
    remove: (id) => client.delete(`/admin/bookings/${id}`).then((r) => r.data),
};

// ---------------------------------------------------------------- Admin: history (done bookings, all barbers)
export const adminHistoryApi = {
    list: (params) => client.get('/admin/bookings', { params }).then((r) => r.data),
    remove: (id) => client.delete(`/admin/bookings/${id}`).then((r) => r.data),
};

// ---------------------------------------------------------------- Admin: reports
export const adminReportsApi = {
    summary: (params) => client.get('/admin/reports/summary', { params }).then((r) => r.data),
};

// ---------------------------------------------------------------- Admin: payments
export const paymentsApi = {
    list: (params) => client.get('/admin/payments', { params }).then((r) => r.data),
    balances: () => client.get('/admin/payments/balances').then((r) => r.data),
    create: (data) => client.post('/admin/payments', data).then((r) => r.data),
    remove: (id) => client.delete(`/admin/payments/${id}`).then((r) => r.data),
};

// ---------------------------------------------------------------- Admin: settings
export const settingsApi = {
    get: () => client.get('/admin/settings').then((r) => r.data),
    update: (data) => client.put('/admin/settings', data).then((r) => r.data),
};

// ---------------------------------------------------------------- Shared: settings (read-only, any role)
// Used by the weekly calendar (both admin and barber) to get work hours /
// slot length without needing admin rights.
export const sharedSettingsApi = {
    get: () => client.get('/settings').then((r) => r.data),
};

// ---------------------------------------------------------------- Admin: clients
export const clientsApi = {
    list: (search) => client.get('/clients', { params: search ? { search } : {} }).then((r) => r.data),
    create: (data) => client.post('/clients', data).then((r) => r.data),
    update: (id, data) => client.put(`/clients/${id}`, data).then((r) => r.data),
    remove: (id) => client.delete(`/clients/${id}`).then((r) => r.data),
    history: (id) => client.get(`/clients/${id}/history`).then((r) => r.data),
};

// ---------------------------------------------------------------- Barber
export const barberApi = {
    requests: (params) => client.get('/barber/requests', { params: params || {} }).then((r) => r.data),
    accept: (id) => client.post(`/barber/requests/${id}/accept`).then((r) => r.data),
    decline: (id) => client.post(`/barber/requests/${id}/decline`).then((r) => r.data),
    complete: (id) => client.post(`/barber/requests/${id}/complete`).then((r) => r.data),
    pay: (id, data) => client.post(`/barber/requests/${id}/pay`, data).then((r) => r.data),
    history: () => client.get('/barber/history').then((r) => r.data),
    reportsSummary: (params) => client.get('/barber/reports/summary', { params }).then((r) => r.data),
    services: () => client.get('/barber/services').then((r) => r.data),
    settings: () => client.get('/barber/settings').then((r) => r.data),
    payments: () => client.get('/barber/payments').then((r) => r.data),
    // Clients (search existing / create new during booking)
    searchClients: (search) => client.get('/barber/clients', { params: { search } }).then((r) => r.data),
    createClient: (data) => client.post('/barber/clients', data).then((r) => r.data),
    // Update booking status (cancel / reschedule from history)
    updateBookingStatus: (id, status) => client.patch(`/barber/bookings/${id}/status`, { status }).then((r) => r.data),
};

// ---------------------------------------------------------------- Barber: own bookings
// A barber books a client directly, without the admin's help.
export const barberBookingsApi = {
    create: (data) => client.post('/barber/bookings', data).then((r) => r.data),
    update: (id, data) => client.put(`/barber/bookings/${id}`, data).then((r) => r.data),
    remove: (id) => client.delete(`/barber/bookings/${id}`).then((r) => r.data),
};

// ---------------------------------------------------------------- Superadmin: barbershops (tenants)
// The platform owner's only endpoints - provisioning/managing shops.
// Deliberately no endpoints here ever touch a shop's business data.
export const superadminApi = {
    list: () => client.get('/superadmin/tenants').then((r) => r.data),
    create: (data) => client.post('/superadmin/tenants', data).then((r) => r.data),
    update: (id, data) => client.put(`/superadmin/tenants/${id}`, data).then((r) => r.data),
    remove: (id) => client.delete(`/superadmin/tenants/${id}`).then((r) => r.data),
    renew: (id, data) => client.post(`/superadmin/tenants/${id}/renew`, data).then((r) => r.data),
    overview: () => client.get('/superadmin/overview').then((r) => r.data),
    getTariffSettings: () => client.get('/superadmin/tariff-settings').then((r) => r.data),
    updateTariffSettings: (data) => client.put('/superadmin/tariff-settings', data).then((r) => r.data),
};
