-- Execute via: heroku run rails db -p

UPDATE users SET name=CONCAT('Anon person #', id);
UPDATE users SET email=CONCAT(id, '@anonusers.swapmyvote.uk');
UPDATE users SET encrypted_password='CENSORED' WHERE encrypted_password != '';
UPDATE users SET token='' WHERE token != '';
UPDATE users SET reset_password_token=NULL WHERE reset_password_token IS NOT NULL;

UPDATE identities SET name=CONCAT('Anon person #', user_id);
UPDATE identities SET email=CONCAT(user_id, '@anonusers.swapmyvote.uk') WHERE email IS NOT NULL;
UPDATE identities SET uid=0 WHERE uid IS NOT NULL;
-- Use Adam's photo so that app still works
UPDATE identities SET image_url='http://pbs.twimg.com/profile_images/631785435799384064/kLpH_eF1_normal.jpg' WHERE image_url IS NOT NULL;
UPDATE identities SET profile_url='https://www.facebook.com/app_scoped_user_id/CENSORED' WHERE profile_url IS NOT NULL;

UPDATE mobile_phones SET number=CONCAT('+44 7777 777 777 ', user_id) WHERE number != '';
UPDATE mobile_phones SET verify_id=NULL WHERE verify_id IS NOT NULL;
