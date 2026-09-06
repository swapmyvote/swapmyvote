ENV["BUNDLE_GEMFILE"] ||= File.expand_path("../Gemfile", __dir__)

require "bundler/setup" # Set up gems listed in the Gemfile.

# concurrent-ruby 1.3.5 dropped its implicit `require "logger"`, which Rails
# 6.1's ActiveSupport::LoggerThreadSafeLevel relies on. This has to happen in
# boot.rb rather than application.rb because bin/rails and bin/rake load
# railties straight after boot, before application.rb is read. Remove once we
# are on Rails 7.1+.
require "logger"

require "bootsnap/setup" # Speed up boot time by caching expensive operations.
