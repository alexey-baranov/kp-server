Vagrant машина

Запуск
vagrant up

Удание
vagrant destroy

Доступ внутрь машины
либо
vagrant ssh
либо
vagrant ssh-config
и использовать порт и ssh ключ которые выведутся, примерно будет так но зависит от каждого запуска
$ vagrant ssh-config
Host default
  HostName 127.0.0.1
  User vagrant
  Port 2222
  UserKnownHostsFile /dev/null
  StrictHostKeyChecking no
  PasswordAuthentication no
  IdentityFile /Users/lik/Works/ubuntu/.vagrant/machines/default/virtualbox/private_key
  IdentitiesOnly yes
  LogLevel FATAL

Внутри есть пользователь vagrant которому можно sudo без пароля и обычный пользователь ubuntu

Автоматизированные тесты с помощью testkitchen (https://kitchen.ci/)
Выполнить все тесты и уничтожить vagrant/virtualbox машину если все тесты прошли
kitchen test

все тесты лежат в папочке ./test и написаны в формате http://serverspec.org/
