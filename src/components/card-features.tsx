import { Link } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  CardAction,
  CardFooter,
} from "./ui/card";
import { Button } from "./ui/button";

interface CardFeaturesProps {
  icons: React.ReactNode;
  title: string;
  description: string;
  redirectUrl: string;
  isDisabled?: boolean;
}

export default function CardFeatures(props: CardFeaturesProps) {
  const { icons, title, description, redirectUrl, isDisabled } = props;

  return (
    <Card
      className={`flex h-full flex-col transition-all 
      ${isDisabled ? "opacity-60 pointer-events-none" : "hover:-translate-y-1 hover:shadow-lg"}`}
    >
      <CardHeader>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          {icons}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-2">
        <CardTitle className="min-h-14 text-lg leading-7">{title}</CardTitle>

        <CardDescription className="min-h-12 leading-6">
          {description}
        </CardDescription>
      </CardContent>

      <CardFooter className="mt-auto flex  border-t pt-4">
        <CardAction className="flex-1">
          {isDisabled ? (
            <Button disabled className="w-full">
              Đang phát triển
            </Button>
          ) : (
            <Button asChild className="w-full">
              <Link to={redirectUrl}>Truy cập</Link>
            </Button>
          )}
        </CardAction>
      </CardFooter>
    </Card>
  );
}
