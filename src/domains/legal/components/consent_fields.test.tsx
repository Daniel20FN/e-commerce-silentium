import dictionary from "@/dictionary/es.json";
import { fireEvent, render, screen } from "@testing-library/react";
import { ConsentFields } from "./consent_fields";

it("shows independent unselected decisions and safe document links", () => {
  const onChange = jest.fn();
  render(
    <ConsentFields
      copy={dictionary.legal}
      value={{ acceptTerms: false, acceptPrivacy: false, adult: false }}
      onChange={onChange}
    />,
  );
  const checkboxes = screen.getAllByRole("checkbox");
  expect(checkboxes).toHaveLength(3);
  checkboxes.forEach((checkbox) => expect(checkbox).not.toBeChecked());
  fireEvent.click(screen.getByLabelText(dictionary.legal.controls.privacy));
  expect(onChange).toHaveBeenCalledWith("acceptPrivacy", true);
  expect(
    screen.getByRole("link", { name: dictionary.legal.privacyLink }),
  ).toHaveAttribute("href", "/legal/privacidad");
  expect(
    screen.getByRole("link", { name: dictionary.legal.termsLink }),
  ).toHaveAttribute("rel", "noopener noreferrer");
});
