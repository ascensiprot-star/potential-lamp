class NotificationService {
    async notify({
        recipientEmail,
        recipientRole = 'customer',
        type,
        title,
        body,
        actionUrl = null,
        resourceType = null,
        resourceId = null,
        priority = 'normal',
        source = 'system',
        sendEmail = false,
    }) {
        const notification = {
            id: Date.now(),
            recipient_email: recipientEmail,
            recipient_role: recipientRole,
            type,
            title,
            body,
            action_url: actionUrl,
            resource_type: resourceType,
            resource_id: resourceId,
            priority,
            source,
            is_read: false,
        };

        if (sendEmail) {
            console.log('[NotificationService] Email send (demo):', { to: recipientEmail, subject: title, body });
        }

        return notification;
    }

    async notifyProvider({ providerEmail, type, title, body, ...rest }) {
        return this.notify({ recipientEmail: providerEmail, recipientRole: 'provider', type, title, body, ...rest });
    }

    async markRead(_notificationId) {
    }

    async markAllRead(_recipientEmail) {
        return 0;
    }

    async getUnreadCount(_recipientEmail) {
        return 0;
    }
}

export const notificationService = new NotificationService();
