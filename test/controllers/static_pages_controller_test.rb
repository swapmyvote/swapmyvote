# frozen_string_literal: true

require 'test_helper'

class StaticPagesControllerTest < ActionController::TestCase
  test 'should get faq' do
    get :faq
    assert_response :success
  end
end
