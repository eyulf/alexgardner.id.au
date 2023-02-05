$(document).ready(function(){
  $('.blog_post_output').addClass("hidden");

  $('.blog_post_output').click(function() {
    var $this = $(this);
    if ($this.hasClass("hidden")) {
      $(this).removeClass("hidden").addClass("visible");
    } else {
      $(this).removeClass("visible").addClass("hidden");
    }
  });
});
