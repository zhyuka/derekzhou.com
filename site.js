/* Email obfuscation */
(function () {
  var user = 'hello';
  var domain = 'derekzhou.com';
  var link = document.getElementById('email-link');
  if (link) {
    link.href = 'mailto:' + user + '@' + domain;
  }
})();
