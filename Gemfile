source "https://rubygems.org"
ruby "2.7.6"

# Bundle edge Rails instead: gem 'rails', github: 'rails/rails'
gem "rails", "~> 5.2.0"
# Use SCSS for stylesheets
gem "sassc-rails"
# Use Uglifier as compressor for JavaScript assets
gem "uglifier", ">= 1.3.0"
# Use CoffeeScript for .coffee assets and views
gem "coffee-rails"
# See https://github.com/sstephenson/execjs#readme for more supported runtimes
# gem 'therubyracer', platforms: :ruby

gem "bootsnap", require: false

# Use jquery as the JavaScript library
gem "jquery-rails"
gem "jquery-ui-rails"
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

gem "devise"

gem "omniauth-facebook"
gem "omniauth-twitter"
gem "omniauth-rails_csrf_protection", "~> 0.1"

gem "haml-rails"
gem "addressable"
gem "normalize-rails"
gem "autoprefixer-rails"

gem "seedbank"
gem "messagebird-rest", require: "messagebird"

gem "random_data"

gem "json"

gem "airbrake", "~> 9.5.0"

gem "scss_lint"
gem "haml_lint"

gem "webpacker", "~> 4.x"

# These need to be outside the development group for Rakefile to
# be happy in Heroku.
gem "rubocop", "~> 1.22.1"
gem "rubocop-rails"
gem "rubocop-rspec"

group :development do
  # Access an IRB console on exception pages or by using <%= console %> in views
  gem "web-console"
  gem "listen"  # required by config.file_watcher
  gem "bundler-audit"
end

group :development, :test do
  gem "jazz_fingers"
  gem "pry-byebug"

  # Call 'byebug' anywhere in the code to stop execution and get a debugger console
  gem "byebug"

  gem "dotenv-rails"

  # Spring speeds up development by keeping your application running in the background. Read more: https://github.com/rails/spring
  gem "spring"

  # Use sqlite3 as the database for Active Record
  gem "sqlite3"

  # add rspec
  gem "rspec-rails", "~> 3.8"
  gem "capybara"
  gem "database_cleaner"

  # Guard checks everything when you save a file
  gem "guard"
  gem "guard-rspec"
  gem "guard-rails"
  gem "guard-bundler"
  gem "guard-rubocop"
  gem "terminal-notifier-guard"

  gem "rails-controller-testing"
  gem "factory_bot_rails"

  gem "guard-scss_lint"
  gem "guard-haml_lint"

  gem "guard-yarn"

  # simple code coverage
  gem "simplecov", require: false
end

group :production do
  gem "pg"
  gem "puma"
end
