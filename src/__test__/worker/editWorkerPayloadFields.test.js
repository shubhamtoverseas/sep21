/* eslint-env jest */
import { workerBasicProfileUpdate } from "../../components/ReusableComponents/form-states";

/* Edit Worker panel (Name + Contact) → POST /update-worker-details: only the fields the panel renders travel.
   A field the panel does not show (hk_id, maiden_surname, alias_name, other mobile, nationality, contract
   category, home phone) is never sent, so its stored value stays untouched (backend ruling, 9 Nov). */
test("the Edit Worker form state carries exactly the panel's fields", () => {
    expect(Object.keys(workerBasicProfileUpdate).sort()).toEqual([
        "country_code", "email", "mobile_number", "name", "surname", "whatsapp_country_code", "whatsapp_number",
    ]);
});

test("no non-panel field can reach the update payload", () => {
    const banned = [
        "hk_id", "maiden_surname", "alias_name", "other_mobile_number", "other_mobile_number_country_code",
        "home_country_code", "home_phone_number", "nationality", "contract_category",
    ];
    banned.forEach((key) => expect(workerBasicProfileUpdate).not.toHaveProperty(key));
});
