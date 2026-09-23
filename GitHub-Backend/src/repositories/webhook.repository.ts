import { pool } from '../db/connection.js';

export class WebhookRepository {
  async findByDeliveryId(deliveryId: string) {
    const res = await pool.query(
      `SELECT * FROM webhook_events WHERE github_delivery_id = $1`,
      [deliveryId]
    );
    return res.rows[0] || null;
  }

  async saveEvent(id: string, deliveryId: string, eventName: string, repositoryId: string | null, payload: any) {
    const res = await pool.query(
      `INSERT INTO webhook_events (id, github_delivery_id, event_name, repository_id, payload, received_at, processing_status)
       VALUES ($1, $2, $3, $4, $5, NOW(), 'PENDING')
       ON CONFLICT (github_delivery_id) DO NOTHING
       RETURNING *`,
      [id, deliveryId, eventName, repositoryId, JSON.stringify(payload)]
    );
    return res.rows[0] || null;
  }

  async markProcessed(id: string) {
    await pool.query(
      `UPDATE webhook_events SET processing_status = 'PROCESSED', processed_at = NOW() WHERE id = $1`,
      [id]
    );
  }

  async markSkipped(id: string, reason?: string) {
    await pool.query(
      `UPDATE webhook_events SET processing_status = 'SKIPPED', processed_at = NOW(), error_message = $1 WHERE id = $2`,
      [reason || 'Skipped', id]
    );
  }

  async markFailed(id: string, errorMessage: string) {
    await pool.query(
      `UPDATE webhook_events SET processing_status = 'FAILED', processed_at = NOW(), error_message = $1 WHERE id = $2`,
      [errorMessage, id]
    );
  }
}

export const webhookRepository = new WebhookRepository();
