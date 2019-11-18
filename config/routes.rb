Rails.application.routes.draw do
  get 'faq', to: "static_pages#faq"
  get 'about', to: "static_pages#about"
  get 'privacy', to: "static_pages#privacy"
  get 'cookies', to: "static_pages#cookies"
  get 'terms', to: "static_pages#terms"
  get 'contact', to: "static_pages#contact"
  get 'account_deleted', to: "static_pages#account_deleted"
  get 'confirm_account_deletion', to: "static_pages#confirm_account_deletion"

  root 'home#index'

  resource :user

  namespace :user do
    resource :constituency
    resource :share, :controller => "share"
    resource :swap
    resource :vote, :controller => "vote"
  end

  get 'auth/:provider/callback', to: 'sessions#create'
  get 'auth/failure', to: 'sessions#retry'
  get 'logout', to: 'sessions#destroy'

  get 'admin/stats', to: "admin#stats"

  get 'uk/swap', to: "api#pre_populate"

  # The priority is based upon order of creation: first created -> highest priority.
  # See how all your routes lay out with "rake routes".

  # You can have the root of your site routed with "root"
  # root 'welcome#index'

  # Example of regular route:
  #   get 'products/:id' => 'catalog#view'

  # Example of named route that can be invoked with purchase_url(id: product.id)
  #   get 'products/:id/purchase' => 'catalog#purchase', as: :purchase

  # Example resource route (maps HTTP verbs to controller actions automatically):
  #   resources :products

  # Example resource route with options:
  #   resources :products do
  #     member do
  #       get 'short'
  #       post 'toggle'
  #     end
  #
  #     collection do
  #       get 'sold'
  #     end
  #   end

  # Example resource route with sub-resources:
  #   resources :products do
  #     resources :comments, :sales
  #     resource :seller
  #   end

  # Example resource route with more complex sub-resources:
  #   resources :products do
  #     resources :comments
  #     resources :sales do
  #       get 'recent', on: :collection
  #     end
  #   end

  # Example resource route with concerns:
  #   concern :toggleable do
  #     post 'toggle'
  #   end
  #   resources :posts, concerns: :toggleable
  #   resources :photos, concerns: :toggleable

  # Example resource route within a namespace:
  #   namespace :admin do
  #     # Directs /admin/products/* to Admin::ProductsController
  #     # (app/controllers/admin/products_controller.rb)
  #     resources :products
  #   end
end
