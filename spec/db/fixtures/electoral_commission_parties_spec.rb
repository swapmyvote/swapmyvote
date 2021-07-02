require_relative "../../../db/fixtures/electoral_commission_parties"

module Db
  module Fixtures
    RSpec.describe ElectoralCommissionParties do
      # rubocop:disable RSpec/IteratedExpectation
      # rubocop's recommendation doesn't improve the code in this instance and it worsens the spec output

      describe "#each" do
        describe "each register entry" do
          specify { subject.each { |entry| expect(entry).to have_key(:ec_ref) } }
          specify { subject.each { |entry| expect(entry).to have_key("RegulatedEntityName") } }
          specify { subject.each { |entry| expect(entry).to have_key("RegisterName") } }
          specify { subject.each { |entry| expect(entry).to have_key("Description") } }
        end
      end

      describe "#unique_entities" do
        let(:unique_entities) { described_class.new.unique_entities }

        describe "Labour Party"  do
          subject { unique_entities["Labour Party"] }

          specify { expect(subject[:joint_description]).to eq("Labour and Co-operative Party") }
          specify { expect(subject[:regulated_entity_name]).to eq("Labour Party") }
        end

        describe "Co-operative Party"  do
          subject { unique_entities["Co-operative Party"] }

          specify { expect(subject[:joint_description]).to eq("Labour and Co-operative Party") }
          specify { expect(subject[:regulated_entity_name]).to eq("Co-operative Party") }
        end

        describe "Conservative and Unionist Party"  do
          subject { unique_entities["Conservative and Unionist Party"] }

          specify { expect(subject[:regulated_entity_name]).to eq("Conservative and Unionist Party") }

          it "has two registrations, for NI and GB" do
            registrations = subject[:registrations].to_a
            register_names = registrations.map{ |r| r["RegisterName"] }

            expect(registrations).to have_attributes(size: 2)
            expect(register_names).to include("Great Britain")
            expect(register_names).to include("Northern Ireland")
          end
        end
      end
    end
  end
end
