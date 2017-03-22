require 'serverspec'
set :backend, :exec

RSpec.configure do |c|
  c.before :all do
    c.path = '/sbin:/usr/sbin:/bin:/usr/bin'
  end
end

describe package('postgresql') do
  it { should be_installed }
end

describe service('postgresql') do
  it { should be_enabled }
  it { should be_running }
end

describe port('5432') do
  it { should be_listening.on('127.0.0.1').with('tcp') }
end

describe command('su - postgres -c \'psql -tA -c "show max_connections"\'') do
  its(:stdout){ should match /^1000$/ }
end
describe command('su - postgres -c \'psql -tA -c "show shared_buffers"\'') do
  its(:stdout){ should match /^512MB$/ }
end

describe command('su - postgres -c \'psql -tA -c "show effective_cache_size"\'') do
  its(:stdout){ should match /^1GB$/ } 
end

describe command('su - postgres -c \'psql -tA -c "show work_mem"\'') do
  its(:stdout){ should match /^40MB$/ }
end
