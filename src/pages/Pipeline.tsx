import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SalesPipelinePage from "./SalesPipeline";
import DeliveryPipelinePage from "./DeliveryPipeline";

export default function PipelinePage() {
  const [tab, setTab] = useState("sales");

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex flex-col">
      <div className="px-6 pt-6">
        <TabsList>
          <TabsTrigger value="sales">Sales Pipeline</TabsTrigger>
          <TabsTrigger value="delivery">Delivery Pipeline</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="sales" className="mt-0">
        <SalesPipelinePage />
      </TabsContent>
      <TabsContent value="delivery" className="mt-0">
        <DeliveryPipelinePage />
      </TabsContent>
    </Tabs>
  );
}
