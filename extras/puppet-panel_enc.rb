#!/usr/bin/env ruby
#
# This file is part of puppet-panel.
#
# puppet-panel is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# puppet-panel is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with puppet-panel.  If not, see <http://www.gnu.org/licenses/>.

if not RUBY_VERSION.to_f > 2
  puts "Please use Ruby 2+"
  exit 1
end

require "base64"
require "json"
require "net/http"
require "net/https"
require "timeout"
require "yaml"

settings_file = File.exist?('/etc/puppetlabs/puppet/puppet-panel.yaml') ? '/etc/puppetlabs/puppet/puppet-panel.yaml' : '/etc/puppet/puppet-panel.yaml'
SETTINGS = YAML.load_file(settings_file)

url = SETTINGS[:url] || raise("Must provide 'url' in #{settings_file}")
authorization = SETTINGS[:authorization] || raise("Must provide 'authorization' in #{settings_file}")

if __FILE__ == $0 then
  begin
    certname = ARGV[0] || raise("Must provide 'certname' as an argument")
    result = {:classes => [], :parameters => {}}

    Timeout.timeout(SETTINGS[:timeout] || 10) do
      uri = URI.parse("#{url}/api/nodes/#{certname}/enc")

      req = Net::HTTP::Get.new(uri.request_uri)
      req.add_field("Authorization", "#{authorization}")

      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = (uri.scheme == 'https')

      if http.use_ssl?
        if SETTINGS[:ssl_ca] && !SETTINGS[:ssl_ca].empty?
          http.ca_file = SETTINGS[:ssl_ca]
          http.verify_mode = OpenSSL::SSL::VERIFY_PEER
        else
          http.verify_mode = OpenSSL::SSL::VERIFY_NONE
        end
      end

      # Get the node from the panel
      res = http.request(req)

      case res
      when Net::HTTPSuccess then
        # Convert to YAML and decrypt parameters
        result_json = JSON.parse(res.body)
        result[:classes] = result_json["classes"]
        result_json["parameters"].each do |parameter|
          name = parameter["name"]
          value = parameter["value"]

          # Decrypt parameter
          if parameter["encrypted"] and parameter["encryption_key"]
            raise "Must provide 'private_key' in #{settings_file} to decrypt parameters" unless SETTINGS[:private_key]
            begin
              encryptionkey = Base64::decode64(parameter["encryption_key"])
              cryptedvalue = Base64::decode64(parameter["value"])

              aes_iv = encryptionkey[0..15]
              encryptionkey = encryptionkey[16..-1]

              # Decrypt AES key
              privkey = OpenSSL::PKey::RSA.new(File.read(SETTINGS[:private_key]))
              aes_key = privkey.private_decrypt(encryptionkey, OpenSSL::PKey::RSA::PKCS1_OAEP_PADDING)

              # Decrypt value
              cipher = OpenSSL::Cipher::AES.new(128, :CBC)
              cipher.decrypt()
              cipher.key = aes_key
              cipher.iv = aes_iv
              value = cipher.update(cryptedvalue)
              value << cipher.final()
            rescue OpenSSL::PKey::RSAError => e
              raise "Can't decrypt encryption key of parameter `#{name}`: #{e}"
            rescue OpenSSL::Cipher::CipherError => e
              raise "Can't decrypt value of parameter `#{name}`: #{e}"
            end
          end

          result[:parameters][name] = value
        end

      when Net::HTTPNotFound then
        # Node not managed by the panel, return an empty result

      else
        # Critical error
        raise "Error retrieving node #{certname}: #{res.class}" unless res.code == "200"
      end

      puts YAML::dump(result)
    end
  rescue Timeout::Error => e
    puts "ENC execution timeout reached. Increase :timeout: in #{settings_file} if you are trying to decrypt lots of parameters."
    exit 1
  rescue => e
    puts "Uncatched exception: #{e}"
    exit 1
  end
end
