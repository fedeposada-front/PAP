import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../index";

describe("Button", () => {
  it("calls onClick when pressed", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();

    render(<Button onClick={onClick}>Confirmer</Button>);
    await user.click(screen.getByRole("button", { name: "Confirmer" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
