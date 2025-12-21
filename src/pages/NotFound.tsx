/**
 * 404 Not Found page for invalid routes
 * Provides navigation options to valid sections
 */
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle className="text-4xl">404 - Page Not Found</CardTitle>
          <CardDescription className="text-lg">
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            You can search for politicians or donors using the options below:
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button asChild className="flex-1">
              <Link to="/politician">Search Politicians</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link to="/donor">Search Donors</Link>
            </Button>
          </div>
          <div className="pt-4 text-center">
            <Button asChild variant="link">
              <Link to="/">Return to Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
