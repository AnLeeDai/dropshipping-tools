import { Outlet } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DefaultLayout() {
  return (
    <div>
      DefaultLayout
      <Outlet />
      <Button variant="destructive">Button</Button>
      <Input placeholder="Input" />
    </div>
  );
}
