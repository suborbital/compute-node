import { Suborbital, localUriConfig } from "../src/main";

const suborbital = new Suborbital(process.env.SCC_ENV_TOKEN, localUriConfig);

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function e2e() {
  try {
    console.log("Running end-to-end test.\n");

    const features = await suborbital.builder.getFeatures();
    console.log(features);

    const params = {
      environment: "dev.suborbital",
      userId: "bigco",
      namespace: "default",
      fnName: "foo",
    };
    const token = await suborbital.admin.getToken(params);
    console.log("Token acquired.");

    const buildParams = { ...params, token, language: "assemblyscript" };

    const template = await suborbital.builder.getTemplate(buildParams);
    console.log("Template loaded.");

    console.log("Building function...");
    const buildResult = await suborbital.builder.build(buildParams, template);
    if (buildResult.succeeded) {
      console.log("Function built successfully.");

      const testResult = await suborbital.builder.testDraft(
        buildParams,
        "tester"
      );
      if (testResult.includes("hello, tester")) {
        console.log("Function tested successfuly");
      } else {
        throw new Error("Function test failed");
      }

      const allFunctions = await suborbital.admin.getFunctions(buildParams);
      console.log("All functions:", allFunctions);

      const deployResult = await suborbital.builder.deployDraft(buildParams);
      console.log("Deployed version", deployResult.version);

      const fullParams = { ...params, version: deployResult.version };

      console.log("Executing function with string input:");
      let result = await suborbital.exec.run(fullParams, "tester!");
      console.log(result.result);

      console.log("Executing function with JSON object input:");
      result = await suborbital.exec.run(fullParams, {
        my: { json: "object" },
      });
      console.log(result.result);

      console.log("Executing function with ArrayBuffer input:");
      result = await suborbital.exec.run(
        fullParams,
        new TextEncoder().encode("UTF-8-encoded text!").buffer
      );
      console.log(result.result);

      await sleep(1000);

      console.log("Fetching function result metadata");
      let results = await suborbital.admin.getFunctionResultsMetadata(
        fullParams
      );
      console.log(results);

      console.log("Fetch single function result:");
      let singleResult = await suborbital.admin.getFunctionResult({
        uuid: result.uuid,
      });
      console.log(singleResult);
    } else {
      console.error("Failed to build function.");
      process.exit(1);
    }
  } catch (e) {
    console.error("NOT OK");
    console.error(e);
    process.exit(1);
  }
}

e2e();
