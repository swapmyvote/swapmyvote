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

        describe "each entry" do
          specify { unique_entities.each { |_, entry| expect(entry).to have_key(:regulated_entity_name) } }
          specify { unique_entities.each { |_, entry| expect(entry).to have_key(:descriptions) } }
          specify { unique_entities.each { |_, entry| expect(entry).to have_key(:registrations) } }
        end

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

      describe "#unique_entities_joint_merged" do
        let(:joint_merged) { described_class.new.unique_entities_joint_merged }

        describe "each entry" do
          specify { joint_merged.each { |_, entry| expect(entry).to have_key(:name) } }
          specify { joint_merged.each { |_, entry| expect(entry).to have_key(:regulated_entity_names) } }
          specify { joint_merged.each { |_, entry| expect(entry).to have_key(:descriptions) } }
          specify { joint_merged.each { |_, entry| expect(entry).to have_key(:registrations) } }
        end

        describe "Labour and Co-operative Party"  do
          subject { joint_merged["Labour and Co-operative Party"] }

          describe "name" do
            specify { expect(subject[:name]).to eq("Labour and Co-operative Party") }
          end

          describe "regulated_entity_names" do
            specify { expect(subject[:regulated_entity_names]).to eq(["Co-operative Party", "Labour Party"]) }
          end

          it "has two registrations, for GB only" do
            registrations = subject[:registrations].to_a
            register_names = registrations.map{ |r| r["RegisterName"] }

            expect(registrations).to have_attributes(size: 2)
            expect(register_names).to include("Great Britain")
            expect(register_names).not_to include("Northern Ireland")
          end
        end

        describe "Conservative and Unionist Party"  do
          subject { joint_merged["Conservative and Unionist Party"] }

          describe "name" do
            specify { expect(subject[:name]).to eq("Conservative and Unionist Party") }
          end

          describe "regulated_entity_names" do
            specify { expect(subject[:regulated_entity_names]).to eq(["Conservative and Unionist Party"]) }
          end

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
