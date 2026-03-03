#!/usr/bin/perl
use strict;
use warnings;

my $file = $ARGV[0] or die "Usage: $0 <supergraph.graphql>\n";
open(my $fh, '<', $file) or die "Cannot open $file: $!\n";
local $/;
my $content = <$fh>;
close($fh);

my $pattern = qr/\@deprecated\((?!\s*reason:)/s;
my @matches;
while ($content =~ /$pattern/sg) {
    push @matches, "VIOLATION";
}

if (@matches) {
    print "BAD: " . scalar(@matches) . " violations found\n";
} else {
    print "OK: no violations found\n";
}
