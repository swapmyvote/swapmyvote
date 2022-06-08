# A sample Guardfile
# More info at https://github.com/guard/guard#readme

## Uncomment and set this to only include directories you want to watch
# directories %w(app lib config test spec features) \
#  .select{|d| Dir.exist?(d) ? d : UI.warning("Directory #{d} does not exist")}

## Note: if you are using the `directories` clause above and you are not
## watching the project directory ('.'), then you will want to move
## the Guardfile to a watched dir and symlink it back, e.g.
#
#  $ mkdir config
#  $ mv Guardfile config/
#  $ ln -s config/Guardfile .
#
# and, you'll have to watch "config/Guardfile" instead of "Guardfile"

notification :terminal_notifier if `uname` =~ /Darwin/

group :all_plugins, halt_on_fail: true do

  guard :bundler do
    require 'guard/bundler'
    require 'guard/bundler/verify'
    helper = Guard::Bundler::Verify.new

    files = ['Gemfile']
    files += Dir['*.gemspec'] if files.any? { |f| helper.uses_gemspec?(f) }

    # Assume files are symlinked from somewhere
    files.each { |file| watch(helper.real_path(file)) }
  end

  guard :yarn do
    watch("package.json")
  end

  # Guard-Rails supports a lot options with default values:
  # daemon: false                        # runs the server as a daemon.
  # debugger: false                      # enable ruby-debug gem.
  # environment: 'development'           # changes server environment.
  # force_run: false                     # kills any process that's holding the listen port before attempting to (re)start Rails.
  # pid_file: 'tmp/pids/[RAILS_ENV].pid' # specify your pid_file.
  # host: 'localhost'                    # server hostname.
  # port: 3000                           # server port number.
  # root: '/spec/dummy'                  # Rails' root path.
  # server: thin                         # webserver engine.
  # start_on_start: true                 # will start the server when starting Guard.
  # timeout: 30                          # waits untill restarting the Rails server, in seconds.
  # zeus_plan: server                    # custom plan in zeus, only works with `zeus: true`.
  # zeus: false                          # enables zeus gem.
  # CLI: 'rails server'                  # customizes runner command. Omits all options except `pid_file`!

  if ENV['USE_GUARD_RAILS']
    guard 'rails' do
      watch('Gemfile.lock')
      watch(%r{^(config|lib)/.*})
    end
  end

  # Note: The cmd option is now required due to the increasing number of ways
  #       rspec may be run, below are examples of the most common uses.
  #  * bundler: 'bundle exec rspec'
  #  * bundler binstubs: 'bin/rspec'
  #  * spring: 'bin/rspec' (This will use spring if running and you have
  #                          installed the spring binstubs per the docs)
  #  * zeus: 'zeus rspec' (requires the server to be started separately)
  #  * 'just' rspec: 'rspec'

  RSPEC_CMD = 'bundle exec rspec --no-profile'

  guard( :rspec,
         cmd: 'NO_COVERAGE=true ' + RSPEC_CMD,
         run_all: {cmd: RSPEC_CMD, message: 'Running all tests'},
         all_after_pass: true,
         all_on_start: true,
       ) do
    require "guard/rspec/dsl"
    dsl = Guard::RSpec::Dsl.new(self)

    # Feel free to open issues for suggestions and improvements

    # RSpec files
    rspec = dsl.rspec
    watch(rspec.spec_helper) { rspec.spec_dir }
    watch(rspec.spec_support) { rspec.spec_dir }
    watch(rspec.spec_files)
    watch(%{db/fixtures})
    watch(%r{^db/fixtures/.*}) { "#{rspec.spec_dir}/db/fixtures" }

    # Ruby files
    ruby = dsl.ruby
    dsl.watch_spec_files_for(ruby.lib_files)

    # Rails files
    rails = dsl.rails(view_extensions: %w(erb haml slim))
    dsl.watch_spec_files_for(rails.app_files)
    dsl.watch_spec_files_for(rails.views)

    watch(rails.controllers) do |m|
      [
        rspec.spec.call("routing/#{m[1]}_routing"),
        rspec.spec.call("controllers/#{m[1]}_controller"),
        rspec.spec.call("acceptance/#{m[1]}")
      ]
    end

    # Rails config changes
    watch(rails.spec_helper)     { rspec.spec_dir }
    watch(rails.routes)          { "#{rspec.spec_dir}/routing" }
    watch(rails.app_controller)  { "#{rspec.spec_dir}/controllers" }
    watch(rails.views)           { "#{rspec.spec_dir}/views" }

    watch(%r{^app/views/(.*_mailer)/.*\.haml$}) {
                                   |m| "#{rspec.spec_dir}/mailers/#{m[1]}_spec.rb" }

    # # Capybara features specs
    # watch(rails.view_dirs)     { |m| rspec.spec.call("features/#{m[1]}") }
    # watch(rails.layouts)       { |m| rspec.spec.call("features/#{m[1]}") }

  end

  guard :scss_lint do
    watch(%r{app/assets/stylesheets/\w.*\.scss})
    watch(%r{^.scss-lint.yml}) { Dir.glob "app/assets/stylesheets/*.scss" }
  end

  guard :haml_lint do
    watch(%r{.+\.html.*\.haml$})
    watch(%r{(?:.+/)?\.haml-lint\.yml$}) { |m| File.dirname(m[0]) }
  end

  guard( :rubocop, cli: %w(--fail-fast) ) do
    watch(%r{.+\.rb$})
    watch(%r{(?:.+/)?\.rubocop(?:_todo)?\.yml$}) { |m| File.dirname(m[0]) }
  end

end # halt_on_fail
