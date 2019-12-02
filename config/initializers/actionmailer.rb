if ENV["MAILGUN_API_KEY"]
  ActionMailer::Base.smtp_settings = {
    port:           ENV["MAILGUN_SMTP_PORT"],
    address:        ENV["MAILGUN_SMTP_SERVER"],
    user_name:      ENV["MAILGUN_SMTP_LOGIN"],
    password:       ENV["MAILGUN_SMTP_PASSWORD"],
    domain:         ENV["MAILGUN_DOMAIN"],
    authentication: :plain
  }
  ActionMailer::Base.delivery_method = :smtp

  puts <<~WARNING if Rails.env != "production"

    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    !! WARNING !! WARNING !! WARNING !! WARNING !! WARNING !! WARNING !!
    !!                                                                !!
    !! Mailgun has been initialized for email delivery, even though   !!
    !! this is not a live environment.  Are you sure you want this?   !!
    !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

  WARNING
end
