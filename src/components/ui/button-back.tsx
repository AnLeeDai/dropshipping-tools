import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "./button";

interface ButtonBackProps {
  to?: string;
}

export default function ButtonBack({ to }: ButtonBackProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <Button onClick={handleBack} variant="outline">
      <ArrowLeft className="w-4 h-4" />
      Quay lại
    </Button>
  );
}
