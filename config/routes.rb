Rails.application.routes.draw do
  devise_for :users, controllers: {
    omniauth_callbacks: "users/omniauth_callbacks",
    registrations: "users/registrations",
    sessions: "users/sessions"
  }

  get "faq", to: "static_pages#faq"
  get "about", to: "static_pages#about"
  get "privacy", to: "static_pages#privacy"
  get "cookies", to: "static_pages#cookies"
  get "terms", to: "static_pages#terms"
  get "contact", to: "static_pages#contact"
  get "api", to: "static_pages#api"
  get "account_deleted", to: "static_pages#account_deleted"
  get "confirm_account_deletion", to: "static_pages#confirm_account_deletion"

  root "home#index"

  resource :user do
    member { get "review" }
  end

  namespace :user do
    resource :constituency
    resource :share, controller: "share"
    resource :swap
    resource :vote, controller: "vote"
  end

  get "mobile_phone/verify_create", as: "verify_mobile"
  match "mobile_phone/verify_token", as: "verify_token", via: [:get, :post]

  get "admin", to: "admin#index"
  get "admin/stats", to: "admin#stats"
  get "admin/send_email_proofs", to: "admin#send_email_proofs", via: [:get]
  match "admin/verify_mobile", to: "admin#verify_mobile",
      as: "fake_verify_mobile", via: [:get, :post]

  get "swap", to: "api#pre_populate"
end
