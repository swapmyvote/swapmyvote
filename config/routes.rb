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

  post "pre_login", to: "home#pre_login"

  # JSON API consumed by the React SPA. Versioned, and separate from the
  # legacy top-level ApiController below (which is a redirect helper, not an
  # API). Served same-origin, so Devise session cookies authenticate it.
  namespace :api do
    namespace :v1 do
      resource :session, only: [:show, :destroy], controller: "session"

      # Reference data for the entry form: unauthenticated, ungated, cacheable.
      resources :parties, only: [:index]
      resources :constituencies, only: [:index]
      resource :election, only: [:show], controller: "election"
    end
  end

  # React SPA (Vite Ruby). Only migrated paths are routed to SpaController;
  # everything else keeps its HAML controller. Keep this allow-list in lockstep
  # with the react-router route table in app/frontend/app/App.tsx.
  # M0 toolchain spike:
  get "app/ping", to: "spa#index"
  # M1 static pages — previewed under /app/* so the canonical /faq, /about, …
  # routes above keep serving HAML until each page is verified and cut over.
  get "app/about", to: "spa#index"
  get "app/contact", to: "spa#index"
  get "app/cookies", to: "spa#index"
  get "app/terms", to: "spa#index"

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
