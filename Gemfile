# frozen_string_literal: true

source 'https://rubygems.org'
ruby '2.6.5'

# Bundle edge Rails instead: gem 'rails', github: 'rails/rails'
gem 'rails', '~> 5.2.0'
# Use SCSS for stylesheets
gem 'sass-rails'
# Use Uglifier as compressor for JavaScript assets
gem 'uglifier', '>= 1.3.0'
# Use CoffeeScript for .coffee assets and views
gem 'coffee-rails'
# See https://github.com/sstephenson/execjs#readme for more supported runtimes
# gem 'therubyracer', platforms: :ruby

gem 'bootsnap', require: false

# Use jquery as the JavaScript library
gem 'jquery-rails'
# Turbolinks makes following links in your web application faster. Read more: https://github.com/rails/turbolinks
# gem 'turbolinks'
# Build JSON APIs with ease. Read more: https://github.com/rails/jbuilder
# gem 'jbuilder', '~> 2.0'
# bundle exec rake doc:rails generates the API under doc/api.
# gem 'sdoc', '~> 0.4.0', group: :doc

# Use ActiveModel has_secure_password
# gem 'bcrypt', '~> 3.1.7'

# Use Unicorn as the app server
# gem 'unicorn'

# Use Capistrano for deployment
# gem 'capistrano-rails', group: :development

gem 'omniauth-facebook'
gem 'omniauth-rails_csrf_protection', '~> 0.1'
gem 'omniauth-twitter'

gem 'addressable'
gem 'haml-rails'
gem 'normalize-rails'

gem 'seedbank'

gem 'random_data'

gem 'json'

gem 'airbrake', '~> 9.5.0'

group :development do
  # Access an IRB console on exception pages or by using <%= console %> in views
  gem 'bundler-audit'
  gem 'listen' # required by config.file_watcher
  gem 'web-console'
end

group :development, :test do
  gem 'jazz_fingers'
  gem 'pry-byebug'

  # Call 'byebug' anywhere in the code to stop execution and get a debugger console
  gem 'byebug'

  gem 'dotenv-rails'

  # Spring speeds up development by keeping your application running in the background. Read more: https://github.com/rails/spring
  gem 'spring'

  # Use sqlite3 as the database for Active Record
  gem 'sqlite3'

  # Use rubocop for static code checking
  gem 'rubocop'
end

group :production do
  gem 'pg'
end
