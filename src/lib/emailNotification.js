/**
 * Sends a browser notification when a new request is created
 * @param {Object} transaction - The transaction data
 */
export function sendBrowserNotification(transaction) {
    try {
        // Check if browser supports notifications
        if (!("Notification" in window)) {
            console.warn("This browser does not support desktop notification");
            return;
        }

        // Check if permission has been granted
        if (Notification.permission === "granted") {
            showNotification(transaction);
        } 
        // If permission hasn't been requested yet, request it
        else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    showNotification(transaction);
                }
            });
        }
    } catch (error) {
        console.error('Error sending browser notification:', error);
    }
}

/**
 * Shows the actual browser notification
 */
function showNotification(transaction) {
    const materialsCount = transaction.materials?.length || 0;
    const materialsText = transaction.materials
        ?.slice(0, 2)
        .map(m => `${m.name} (${m.quantity} ${m.unit})`)
        .join(', ') || '';
    const moreMaterials = materialsCount > 2 ? ` and ${materialsCount - 2} more` : '';

    const title = `New ${transaction.transaction_type === 'take' ? 'Take' : 'Return'} Request`;
    const body = `${transaction.worker_name} (ID: ${transaction.worker_id})\n${materialsText}${moreMaterials}`;

    const notification = new Notification(title, {
        body: body,
        icon: '/akk logo.jpg', // Your logo
        badge: '/akk logo.jpg',
        tag: `request-${transaction.id}`, // Prevents duplicate notifications
        requireInteraction: false,
        silent: false
    });

    // Optional: Click handler to focus the window
    notification.onclick = () => {
        window.focus();
        notification.close();
    };

    // Auto-close after 5 seconds
    setTimeout(() => {
        notification.close();
    }, 5000);
}
