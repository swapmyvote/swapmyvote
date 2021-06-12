require "yaml"

# This is an encapsulation of the Yaml file for By-election 2019

module Db
  module Fixtures
    class Be2021Yaml
      FILENAME = "db/fixtures/be2021.yml"

      class << self
        def instance
          @instance ||= new
        end

        def data
          instance.data
        end
      end

      attr_reader :file_name

      def data
        ::YAML.load(file_content)
      end

      def file_content
        @file_content ||= ::File.read(FILENAME)
      rescue Errno::ENOENT => e
        puts "Filename #{FILENAME} read failed with error #{e}"
        raise e
      end
    end
  end
end
