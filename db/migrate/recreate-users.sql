BEGIN TRANSACTION;
CREATE TABLE users_new("id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, "provider" varchar, "uid" varchar, "name" varchar, "email" varchar, "image" varchar, "token" varchar, "expires_at" datetime, "preferred_party_id" integer, "willing_party_id" integer, "constituency_id" integer, "swap_id" integer, "created_at" datetime NOT NULL, "updated_at" datetime NOT NULL, "has_voted" boolean DEFAULT '0', "sent_vote_reminder_email" boolean DEFAULT '0');
INSERT INTO users_new SELECT "id", "provider", "uid", "name", "email", "image", "token", "expires_at", "preferred_party_id", "willing_party_id", "constituency_id", "swap_id", "created_at", "updated_at", "has_voted", "sent_vote_reminder_email" FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;
COMMIT;
