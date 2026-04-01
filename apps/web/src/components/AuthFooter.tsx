import { Link } from 'react-router-dom';

export function AuthFooter() {
  return (
    <footer
      data-testid="auth-footer"
      className="border-t border-border px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground"
    >
      <p>&copy; {new Date().getFullYear()} EduSphere. All rights reserved.</p>
      <nav className="flex items-center gap-3" aria-label="Footer links">
        <Link to="/privacy" className="hover:text-foreground transition-colors">
          Privacy
        </Link>
        <span aria-hidden="true">&middot;</span>
        <Link to="/terms" className="hover:text-foreground transition-colors">
          Terms
        </Link>
        <span aria-hidden="true">&middot;</span>
        <Link
          to="/accessibility"
          className="hover:text-foreground transition-colors"
        >
          Accessibility
        </Link>
      </nav>
    </footer>
  );
}
