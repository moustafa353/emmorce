export const api = {
    async post(endpoint, data) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        if (endpoint === '/orders') {
            const orders = JSON.parse(localStorage.getItem('orders')) || [];
            orders.push(data);
            localStorage.setItem('orders', JSON.stringify(orders));
            return { success: true, orderId: data.orderNumber };
        }

        throw new Error('Endpoint not mock-implemented: ' + endpoint);
    }
};
