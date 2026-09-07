require_relative "boot"

require "rails/all"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module SwapMyVote
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 8.1

    # Configuration for the application, engines, and railties goes here.
    #
    # These settings can be overridden in specific environments using the files
    # in config/environments, which are processed later.
    #
    # config.time_zone = "Central Time (US & Canada)"
    # config.eager_load_paths << Rails.root.join("extras")

    config.action_mailer.default_url_options = {
      host: ENV["SERVER_HOST_PORT"] || ENV["SERVER_HOST"]
    }
    # Outside app/ deliberately: app/mailers is an eager-load root, so a
    # previews/ directory under it has to define Previews::UserMailerPreview
    # to satisfy Zeitwerk. Rails only registers preview_path as its own
    # autoload root when show_previews is true, which in production depends on
    # MAILER_PREVIEWS -- so leaving it under app/ boots fine in development and
    # raises Zeitwerk::NameError in production. spec/ mirrors Rails' own
    # test/mailers/previews default.
    config.action_mailer.preview_paths = ["#{Rails.root}/spec/mailers/previews"]

    # Settings in config/environments/* take precedence over those specified here.
    # Application configuration can go into files in config/initializers
    # -- all .rb files in that directory are automatically loaded after loading
    # the framework and any gems in your application.

    config.generators.test_framework :rspec
  end
end
