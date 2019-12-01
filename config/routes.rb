Rails.application.routes.draw do
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

  resource :user

  namespace :user do
    resource :constituency
    resource :share, controller: "share"
    resource :swap
    resource :vote, controller: "vote"
  end

  get "auth/:provider/callback", to: "sessions#create"
  get "auth/failure", to: "sessions#retry"
  get "logout", to: "sessions#destroy"

  get "mobile_phone/verify_create", as: "verify_mobile"
  match "mobile_phone/verify_token", as: "verify_token", via: [:get, :post]

  get "admin/stats", to: "admin#stats"

  get "swap", to: "api#pre_populate"
end
