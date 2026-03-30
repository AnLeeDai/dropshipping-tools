import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";

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
    <Card className="flex w-full flex-col self-start">
      <CardHeader className="space-y-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border bg-muted/40">
            {icons}
          </div>
          <Badge variant={isDisabled ? "outline" : "secondary"}>
            {isDisabled ? "Sắp có" : "Dùng được"}
          </Badge>
        </div>

        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        <CardDescription className="leading-6">{description}</CardDescription>
      </CardContent>

      <CardFooter className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground sm:max-w-[60%]">
          {isDisabled ? "Chức năng này đang được hoàn thiện." : "Mở công cụ này."}
        </p>

        {isDisabled ? (
          <Button disabled variant="outline" className="w-full sm:w-auto">
            Sắp có
          </Button>
        ) : (
          <Button asChild className="w-full sm:w-auto">
            <Link to={redirectUrl}>
              Mở
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
