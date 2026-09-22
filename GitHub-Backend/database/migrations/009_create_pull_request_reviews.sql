CREATE TABLE IF NOT EXISTS pull_request_reviews (
  id VARCHAR(36) PRIMARY KEY,
  pull_request_id VARCHAR(36) NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
  github_review_id BIGINT UNIQUE,
  reviewer_developer_id VARCHAR(36) REFERENCES developers(id) ON DELETE SET NULL,
  state VARCHAR(50) NOT NULL,
  body TEXT,
  submitted_at TIMESTAMPTZ NOT NULL,
  html_url VARCHAR(512)
);

CREATE INDEX IF NOT EXISTS idx_pr_reviews_pr_id ON pull_request_reviews(pull_request_id);
CREATE INDEX IF NOT EXISTS idx_pr_reviews_reviewer ON pull_request_reviews(reviewer_developer_id);
