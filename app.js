
/**
 * Module dependencies.
 */

var express = require('express');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'your secret here' }));
  app.use(express.compiler({ src: __dirname + '/public', enable: ['sass'] }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes
var exec = require('child_process').exec;

app.get('/', function(req, res) {
  res.render('index', {
    title: "Hello"
  });
});

var path = require('path');

function getAuthorCompany(author) {
  var relation = {'book.com': 'bn', 
                  'intrinsyc.com': 'bn',
                  'ti.com': 'ti',
                  'mm-sol.com': 'ti'};
  
  var pattern = /([\w*]+(@|\(at\)|\[at\])+[\w*]+(\.|\(dot\)|\[dot\])+[\w]*)/gi;
  var email_address = author.match(pattern)[0];
  var domain_name = email_address.split('@')[1];
  if (domain_name in relation) {
    return relation[domain_name];
  }
  return 'google';
}

app.post('/difference', function(req, res) {
  console.log(req.body.server_from);
  console.log(req.body.server_to);
  console.log(req.body.branch_from);
  console.log(req.body.branch_to);
  console.log(req.body.same_server);  // on or 'undefined'
  console.log(req.body.same_branch);
  console.log(req.body.repository);
  
  var workspace   = '/Users/rlee/tmp';
  var server_from = req.body.server_from;
  var same_server = !(typeof req.body.same_server == 'undefined');
  var server_to   =  same_server ? server_from : req.body.server_to;
  var branch_from = req.body.branch_from;
  var same_branch = !(typeof req.body.same_branch == 'undefined');
  var branch_to   = same_branch ? branch_from : req.body.branch_to;
  var repository  = req.body.repository;

  var server_from  = 'ssh://' + path.join(server_from + ':29418', repository);
  var server_to    = 'ssh://' + path.join(server_to + ':29418', repository);
  var basename     = path.basename(server_to, '.git');
  var gitworkspace = path.join(workspace, basename);

  console.log(server_from);
  console.log(server_to);
  console.log(branch_from);
  console.log(branch_to);
  console.log(workspace);
  console.log(gitworkspace);
  
  //TODO: verify the branches is different when same server
  
  path.exists(gitworkspace, function(exists) {
    var gitCheckoutCmd = null;
    if (exists) {
      gitCheckoutCmd = 'cd ' + gitworkspace + ' && git fetch origin  && git checkout -b ' + branch_to + ' origin/' + branch_to;
    } else {
      gitCheckoutCmd = 'cd ' + workspace + ' && git clone ' + server_to + ' && cd ' + basename + ' && git checkout -b ' + branch_to + ' origin/' + branch_to;
    }
    console.log(gitCheckoutCmd);
    exec(gitCheckoutCmd, function(error, stdout, stderr) {
      if (error != null) {
        console.log('exec ' + gitCheckoutCmd + ' error: ' + error);
      }
      if (! same_server) {
        var gitCheckRemoteCmd = 'cd ' + gitworkspace + ' && git remote -v | grep ext';
        console.log(gitCheckRemoteCmd);
        exec(gitCheckRemoteCmd, function(error, stdout, stderr) {
          if (error != null) {
            console.log('exec ' + gitCheckRemoteCmd + ' error: ' + error);
          }
          if (stdout != '') {
            var gitRemoveExtCmd = 'cd ' + gitworkspace + ' && git remote rm ext';
            console.log(gitRemoveExtCmd);
            exec(gitRemoveExtCmd, function(error, stdout, stderr) {
              if (error != null) {
                console.log('exec ' + gitRemoveExtCmd + ' error: ' + error);
              }
              var gitFetchExtCmd = 'cd ' + gitworkspace + ' && git remote add -t ' + branch_from + ' -f ext ' + server_from;
              console.log(gitFetchExtCmd);
              exec(gitFetchExtCmd, function(error, stdout, stderr) {
                if (error != null) {
                  console.log('exec ' + gitFetchExtCmd + ' error: ' + error);
                }
                var gitLogCmd = 'cd ' + gitworkspace + ' && git --no-pager log --left-right --reverse --no-merges --cherry-pick --pretty=\'format:%H|%an < %ae >|%ad|%s|%m\' ext/' + branch_from + '...' + branch_to;
                console.log(gitLogCmd);
                exec(gitLogCmd, function(error, stdout, stderr) {
                  if (error != null) {
                    console.error('exec ' + gitLogCmd + ' error: ' + error);
                  }
                  var collections = [];
                  var lines = stdout.split('\n');
                  if (lines != '') {
                    for (var i in lines) {
                      var records = lines[i].split('|');
                      var o = {commit: records[0], author: records[1], date: records[2], comments: records[3], side: records[4], company: getAuthorCompany(records[1])};
                      collections.push(o);
                    }
                  }
                  //render them
                  res.render('difference', {
                    title: 'Commit List in different server',
                    repository: gitworkspace,
                    server_left: server_from,
                    branch_left: branch_from,
                    server_right: server_to,
                    branch_right: branch_to,
                    commits: collections
                  });
                });
              });
            });
          } else {
            var gitFetchExtCmd = 'cd ' + gitworkspace + ' && git remote add -t ' + branch_from + ' -f ext ' + server_from;
            console.log(gitFetchExtCmd);
            exec(gitFetchExtCmd, function(error, stdout, stderr) {
              if (error != null) {
                console.log('exec ' + gitFetchExtCmd + ' error: ' + error);
              }
              var gitLogCmd = 'cd ' + gitworkspace + ' && git --no-pager log --left-right --reverse --no-merges --cherry-pick --pretty=\'format:%H|%an < %ae >|%ad|%s|%m\' ext/' + branch_from + '...' + branch_to;
              console.log(gitLogCmd);
              exec(gitLogCmd, function(error, stdout, stderr) {
                if (error != null) {
                  console.error('exec ' + gitLogCmd + ' error: ' + error);
                }
                var collections = [];
                var lines = stdout.split('\n');
                if (lines != '') {
                  for (var i in lines) {
                    var records = lines[i].split('|');
                    var o = {commit: records[0], author: records[1], date: records[2], comments: records[3], side: records[4], company: getAuthorCompany(records[1])};
                    collections.push(o);
                  }
                }
                //render them
                res.render('difference', {
                  title: 'Commit List in different server',
                  repository: gitworkspace,
                  server_left: server_from,
                  branch_left: branch_from,
                  server_right: server_to,
                  branch_right: branch_to,
                  commits: collections
                });
              });
            });
          }
        });
      } else {
        var gitLogCmd = 'cd ' + gitworkspace + ' && git --no-pager log --left-right --reverse --no-merges --cherry-pick --pretty=\'format:%H|%an < %ae >|%ad|%s|%m\' ' + branch_from + '...' + branch_to;
        console.log(gitLogCmd);
        exec(gitLogCmd, function(error, stdout, stderr) {
          if (error != null) {
            console.error('exec ' + gitLogCmd + ' error: ' + error);
          }
          var collections = [];
          var lines = stdout.split('\n');
          if (lines != '') {
            for (var i in lines) {
              var records = lines[i].split('|');
              var o = {commit: records[0], author: records[1], date: records[2], comments: records[3], side: records[4]};
              collections.push(o);
            }
          }
          //render them
          res.render('difference', {
            title: 'Commit List in same server',
            repository: gitworkspace,
            server_left: server_from,
            branch_left: branch_from,
            server_right: server_to,
            branch_right: branch_to,
            commits: collections
          });
        });
      }
    });
  });
});

app.post('/cherrypick/', function(req, res) {
  if (req.xhr) {
    console.log(req.body.branch_from);
    console.log(req.body.branch_to);
    console.log(req.body.server_from);
    console.log(req.body.server_to);
    console.log(req.body.commit_id);
    console.log(req.body.repository);
    var repository = req.body.repository;
    var branch_to  = req.body.branch_to;
    var commit_id  = req.body.commit_id;
    
    var gitGetBranchNameCmd = 'cd ' + repository + ' && git name-rev --name-only HEAD';
    console.log(gitGetBranchNameCmd);
    exec(gitGetBranchNameCmd, function(error, stdout, stderr) {
      if (error != null) {
        console.error('exec error: ' + error);
      }
      if (stderr != '') {
        console.error('stderr: ' + stderr);
      }
      var branch = stdout.replace(/[\n\r]$/,"");
      var gitCheckoutBranchCmd = 'cd ' + repository;
      if (branch != branch_to) {
        gitCheckoutBranchCmd += ' && git checkout ' + branch_to;
      }
      var gitCherryPickCmd = gitCheckoutBranchCmd + ' && git cherry-pick -x -s ' + commit_id;
      console.log(gitCherryPickCmd);
      exec(gitCherryPickCmd, function(error, stdout, stderr) {
        if (error != null) {
          console.log('exec ' + gitCherryPickCmd + ' error: ' + error);
          // here merge cause conflict
          res.send('CONFLICT');
          // DONE: should launch cloud9 to point to the conflict line
          if (gEditor != null) {
            gEditor.kill();
          } 
          gEditor = launchEditor(repository);
          return;
        }
        if (stderr != '') {
          console.error('stderr: ' + stderr);
        }
        // get the latest log message, then pass them to view
        var gitLogCmd = 'cd ' + repository + ' && git log -1 --pretty=\'format:%H|%an < %ae >|%ad|%s|%m\' ';
        console.log(gitLogCmd);
        exec(gitLogCmd, function(error, stdout, stderr) {
          if (error != null) {
            console.log('exec ' + gitLogCmd + ' error: ' + error);
          }
          var record = stdout.split('|');
          var o = {commit: record[0], author: record[1], date: record[2], comments: record[3], side: record[4]};
          res.send(o);
        });
      });
    });    
  }
})

app.post('/rebase/', function(req, res) {
  if (req.xhr) {
    console.log(req.body.branch_to);
    console.log(req.body.commit_id);
    console.log(req.body.repository);
    
    var repository = req.body.repository;
    var branch_to  = req.body.branch_to;
    var commit_id  = req.body.commit_id;
    var gitRebaseCmd = 'cd ' + repository + ' && git rebase --onto ' + commit_id + '^ ' + commit_id + ' ' + branch_to;
    
    console.log(gitRebaseCmd);
    exec(gitRebaseCmd, function(error, stdout, stderr) {
      if (error != null) {
        console.log('exec ' + gitRebaseCmd + ' error: ' + error);
        res.send('CONFLICT');
        // DONE: should start cloud9 to point to the conflict line
        if (gEditor != null) {
          gEditor.kill();
        } 
        gEditor = launchEditor(repository);
        return;
      }
      /*if (stderr != null) {
        console.log('exec ' + gitRebaseCmd + ' stderr: ' + stderr);
      }*/
      res.send('OK');
    });
  }
})

app.post('/fixit/', function(req, res) {
  if (req.xhr) {
    console.log(req.body.repository);
    
    var repository = req.body.repository;
    //var gitCommitCmd = 'cd ' + repository + ' && git commit -a -C ' + commit_id
    var gitRebaseContinueCmd = 'cd ' + repository + ' && git rebase --continue';
    console.log(gitRebaseContinueCmd);
    exec(gitRebaseContinueCmd, function(error, stdout, stderr) {
      if (error != null) {
        consolf.log('exec ' + gitRebaseContinueCmd + ' error: ' + error);
        res.send('CONFLICT');
        // DONE: should start cloud9 to point to the conflict line
        if (gEditor != null) {
          gEditor.kill();
        } 
        gEditor = launchEditor(repository);
        return;
      }
      /*if (stderr != '') {
        console.log('exec ' + gitRebaseContinueCmd + ' stderr: ' + stderr);
      }*/
      res.send('OK');
    });
  }
});

function launchEditor(workspace) {
  var launchEditorCmd = 'node /Users/rlee/workspace/cloud9/bin/cloud9.js -p 3001 -w ' + workspace;
  console.log(launchEditorCmd);
  var child = exec(launchEditorCmd, function(error, stdout, stderr) {
    if (error != null) {
      console.log('exec ' + launchEditorCmd + ' error: ' + error);
    }
  });
  return child;
}

var gEditor = null;

app.post('/commit/', function(req, res) {
  if (req.xhr) {
    console.log(req.body.repository);
    console.log(req.body.commit_id);
    
    var repository = req.body.repository;
    var commit_id  = req.body.commit_id;

    // DONE: here to grep the fixed conflict files, to check if there is some characters like '^[<|=|>]{7}', which is conflict sign
    var grepConflictCmd = 'cd ' + repository + " && grep -rE '^[<|=|>]{7}' *";
    console.log(grepConflictCmd);
    exec(grepConflictCmd, function(error, stdout, stderr) {
      console.log(stdout);
      if (stdout != '') {
        res.send('CONFLICT');
        // DONE: should start cloud9 to point to the conflict line
        if (gEditor != null) {
          gEditor.kill();
        } 
        gEditor = launchEditor(repository);
        return;
      }
      
      // TODO: here insert 'git diff HEAD', if return nothing, then 'git reset HEAD', this case is because merge don't change anything as previous version.
      var gitCommitCmd = 'cd ' + repository + ' && git commit -a -C ' + commit_id;
      console.log(gitCommitCmd);
      exec(gitCommitCmd, function(error, stdout, stderr) {
        if (error != null) {
          console.log('exec ' + gitCommitCmd + ' error: ' + error);
        }
        // get the latest log message, then pass them to view
        var gitLogCmd = 'cd ' + repository + ' && git log -1 --pretty=\'format:%H|%an < %ae >|%ad|%s|%m\' ';
        console.log(gitLogCmd);
        exec(gitLogCmd, function(error, stdout, stderr) {
          if (error != null) {
            console.log('exec ' + gitLogCmd + ' error: ' + error);
          }
          var record = stdout.split('|');
          var o = {commit: record[0], author: record[1], date: record[2], comments: record[3], side: record[4]};
          res.send(o);
        });
      });
    });
  }
});

app.post('/cancel/', function(req, res) {
  if (req.xhr) {
    console.log(req.body.repository);
    var repository = req.body.repository;
    
    var gitResetCmd = 'cd ' + repository + ' && git reset --hard HEAD';
    console.log(gitResetCmd);
    exec(gitResetCmd, function(error, stdout, stderr) {
      if (error != null) {
        console.log('exec ' + gitResetCmd + ' error: ' + error);
      }
      res.send('OK');
    });
  }
});

app.post('/showdetail/', function(req, res) {
  if (req.xhr) {
    console.log(req.body.commit_id);
    console.log(req.body.repository);
    var repository = req.body.repository;
    var commit_id  = req.body.commit_id;
    
    var gitShowCmd = 'cd ' + repository + ' && git show --pretty="format:%B" --name-only ' + commit_id;
    console.log(gitShowCmd);
    exec(gitShowCmd, function(error, stdout, stderr) {
      if (error != null) {
        console.log('exec ' + gitShowCmd + ' error: ' + error);
      }
      var o = {commit: commit_id, information: stdout};
      res.send(o);
    });
  }
});

app.post('/revert/', function(req, res) {
  if (req.xhr) {
    console.log(req.body.commit_id);
    console.log(req.body.repository);
    var repository = req.body.repository;
    var commit_id  = req.body.commit_id;
    
    var gitRevertCmd = 'cd ' + repository + ' && git revert --no-edit ' + commit_id;
    console.log(gitRevertCmd);
    exec(gitRevertCmd, function(error, stdout, stderr) {
      if (error != null) {
        console.log('exec ' + gitRevertCmd + ' error: ' + error);
        res.send('CONFLICT');
        // DONE: should start cloud9 to point to the conflict line
        if (gEditor != null) {
          gEditor.kill();
        } 
        gEditor = launchEditor(repository);
        return;
      }
      res.send("OK");
    });
  }
});

app.post('/listrepos/', function(req, res) {
  if (req.xhr) {
    console.log(req.body.server);
    var server = req.body.server;
    
    var gerritListProjects = 'ssh -p 29418 ' + server + ' gerrit ls-projects';
    console.log(gerritListProjects);
    exec(gerritListProjects, function(error, stdout, stderr) {
      if (error != null) {
        console.log('exec ' + gerritListProjects + ' error: ' + error);
      }
      var lines = stdout.split('\n');
      res.send(lines);
    });
  }
});

app.post('/pushtoreview/', function(req, res) {
  if (req.xhr) {
    console.log(req.body.repository);
    console.log(req.body.branch);
    console.log(req.body.server_to);
    var repository = req.body.repository;
    var branch     = req.body.branch;
    var server     = req.body.server_to;
    
    var pushToReviewCmd = 'cd ' + repository + ' && git push origin ' + branch + ':refs/for/' + branch;
    console.log(pushToReviewCmd);
    exec(pushToReviewCmd, function(error, stdout, stderr) {
      if (error != null) {
        console.log('exec ' + pushToReviewCmd + ' error: ' + error);
      }
      console.log(stdout);
      var lines   = stdout.split('\n');
      var pattern = /^remote: \s (http.*)$/;
      var reviews = [];
      if (lines != '') {
        for (var line in lines) {
          var record = pattern.exec(line);
          if (record != null) {
            reviews.push(record);  
          }
        }
      }
      console.log(reviews);
      //res.send(reviews);
      res.send("pushing commit(s) to review server successfully, please go to http://" + server + ":8080, menu 'All' -> 'Open' to get them!");
    });
  }
});

app.post('/cancelaction/', function(req, res) {
  if (req.xhr) {
    console.log(req.body.repository);
    var repository = req.body.repository;
    var gitStatus  = 'cd ' + repository + ' && git status';
    
    console.log(gitStatus);
    exec(gitStatus, function(error, stdout, stderr) {
      if (error != null) {
        console.log('exec ' + gitStatus + ' error: ' + error);
      }
      // get how many commit need to be cancelled
      var pattern = /^# Your branch is ahead of .* by (\d) commit.*/m;
      var match = pattern.test(stdout);
      console.log(match);
      if (!match) {
        res.send("Don't need to reset the action!");
        return;
      }
      match = pattern.exec(stdout);
      var gitResetCmd = 'cd ' + repository + ' && git reset --hard HEAD~' + match[1];
      console.log(gitResetCmd);
      exec(gitResetCmd, function(error, stdout, stderr) {
        if (error != null) {
          console.log('exec ' + gitResetCmd + ' error: ' + error);
        }
        res.send("Reset the action successfully!");
      });
    });
  }
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
