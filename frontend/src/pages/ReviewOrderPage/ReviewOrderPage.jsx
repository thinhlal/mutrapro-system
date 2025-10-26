import { Result, Button } from "antd";

export default function ReviewOrderPage() {
  return (
    <Result
      status="success"
      title="Order details captured"
      subTitle="This is a placeholder page for the next step (Contract & Deposit)."
      extra={
        <Button type="primary" href="/services">
          Back to Services
        </Button>
      }
    />
  );
}
